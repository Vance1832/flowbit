from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import AuditLog
from .services import create_audit_log


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
        self.assertEqual(len(response.data), 1)

        entry = response.data[0]
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
        AuditLog.objects.all().delete()
        create_audit_log(actor_user=None, action="close", target_table="result_periods")

        self.client.force_authenticate(self.owner)
        response = self.client.get(AUDIT_URL)

        entry = response.data[0]
        self.assertEqual(entry["actor"], "System")
        self.assertEqual(entry["role"], "System")
        self.assertEqual(entry["target"], "Result Period")
