from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from rest_framework.test import APITestCase

from .models import AppendOnlyError, AuditLog
from .services import create_audit_log, verify_audit_chain


User = get_user_model()

AUDIT_URL = "/api/audit/admin/logs/"


class AuditLogApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959100000001", password="pass12345", name="Owner", role="owner"
        )
        self.member = User.objects.create_user(
            phone="+959100000002", password="pass12345", name="Member", role="user"
        )
        create_audit_log(
            actor_user=self.owner,
            action="approve",
            target_table="deposit_requests",
            target_id=7,
            old_values={"status": "pending"},
            new_values={"status": "approved"},
            reason="Verified payment proof",
        )

    def test_requires_authentication(self):
        response = self.client.get(AUDIT_URL)
        self.assertEqual(response.status_code, 401)

    def test_regular_user_forbidden(self):
        self.client.force_authenticate(self.member)
        response = self.client.get(AUDIT_URL)
        self.assertEqual(response.status_code, 403)

    def test_owner_receives_serialized_logs(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(AUDIT_URL)

        self.assertEqual(response.status_code, 200)
        # Paginated envelope: {count, next, previous, results}.
        self.assertEqual(response.data["count"], 1)
        self.assertIsNone(response.data["next"])
        self.assertEqual(len(response.data["results"]), 1)

        entry = response.data["results"][0]
        self.assertEqual(entry["actor"], "Owner")
        self.assertEqual(entry["role"], "Owner")
        self.assertEqual(entry["action"], "APPROVE")
        self.assertEqual(entry["target"], "Deposit Request")
        self.assertEqual(entry["target_id"], "7")
        self.assertIn('"status": "approved"', entry["new_values"])

    def test_export_csv_requires_admin_and_returns_csv(self):
        url = "/api/audit/admin/logs/export/"
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(url).status_code, 403)

        self.client.force_authenticate(self.owner)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("flowbit-audit-logs.csv", response["Content-Disposition"])
        body = b"".join(response.streaming_content).decode()
        self.assertIn("Time,Actor,Role,Action", body)
        self.assertIn("APPROVE", body)

    def test_system_actor_when_no_user(self):
        AuditLog.unsafe_objects.all().delete()  # reset for a clean single-entry assert
        create_audit_log(actor_user=None, action="close", target_table="result_periods")

        self.client.force_authenticate(self.owner)
        response = self.client.get(AUDIT_URL)

        entry = response.data["results"][0]
        self.assertEqual(entry["actor"], "System")
        self.assertEqual(entry["role"], "System")
        self.assertEqual(entry["target"], "Result Period")

    def test_pagination_bounds_response_and_exposes_full_history(self):
        # 120 entries total; page_size caps each response and all are reachable.
        for i in range(120):
            create_audit_log(
                actor_user=self.owner,
                action="update",
                target_table="ledgers",
                target_id=i,
            )

        self.client.force_authenticate(self.owner)

        first = self.client.get(AUDIT_URL, {"page_size": 50})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data["count"], 121)  # 120 + the setUp entry
        self.assertEqual(len(first.data["results"]), 50)
        self.assertIsNotNone(first.data["next"])

        last = self.client.get(AUDIT_URL, {"page_size": 50, "page": 3})
        self.assertEqual(last.status_code, 200)
        self.assertEqual(len(last.data["results"]), 21)
        self.assertIsNone(last.data["next"])

    def test_page_size_is_capped(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(AUDIT_URL, {"page_size": 9999})
        # Honoured but clamped to max_page_size; the single entry still returns.
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)


class AuditLogAppendOnlyTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959110000001", password="pass12345", name="Owner", role="owner"
        )

    def _log(self, **kwargs):
        return create_audit_log(actor_user=self.owner, action="update", **kwargs)

    def test_entry_is_hashed_on_create(self):
        entry = self._log(reason="first")
        self.assertTrue(entry.entry_hash)
        self.assertEqual(entry.prev_hash, "")  # genesis

        second = self._log(reason="second")
        self.assertEqual(second.prev_hash, entry.entry_hash)  # chained

    def test_save_on_existing_entry_is_blocked(self):
        entry = self._log(reason="immutable")
        entry.reason = "tampered"
        with self.assertRaises(AppendOnlyError):
            entry.save()

    def test_instance_delete_is_blocked(self):
        entry = self._log(reason="keep")
        with self.assertRaises(AppendOnlyError):
            entry.delete()

    def test_bulk_delete_and_update_are_blocked(self):
        self._log(reason="keep")
        with self.assertRaises(AppendOnlyError):
            AuditLog.objects.all().delete()
        with self.assertRaises(AppendOnlyError):
            AuditLog.objects.all().update(reason="x")

    def test_verify_passes_for_untampered_chain(self):
        self._log(reason="a")
        self._log(reason="b")
        self._log(reason="c")
        result = verify_audit_chain()
        self.assertTrue(result["ok"])
        self.assertEqual(result["count"], 3)
        self.assertEqual(result["broken_ids"], [])

    def test_verify_detects_a_tampered_row(self):
        self._log(reason="a")
        target = self._log(reason="b")
        self._log(reason="c")

        # Simulate DB-level tampering that bypasses the ORM guards.
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE audit_auditlog SET reason = %s WHERE id = %s",
                ["forged", target.id],
            )

        result = verify_audit_chain()
        self.assertFalse(result["ok"])
        self.assertIn(target.id, result["broken_ids"])

    def test_verify_detects_a_deleted_row(self):
        self._log(reason="a")
        middle = self._log(reason="b")
        after = self._log(reason="c")

        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM audit_auditlog WHERE id = %s", [middle.id])

        result = verify_audit_chain()
        self.assertFalse(result["ok"])
        # The row after the gap no longer links to its (now missing) predecessor.
        self.assertIn(after.id, result["broken_ids"])

    def test_verify_endpoint_reports_ok(self):
        self._log(reason="a")
        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(self.owner)
        response = client.get("/api/audit/admin/logs/verify/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
