from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APITestCase

from .models import (
    DepositRequest,
    SystemSetting,
    UserWallet,
    WalletTransaction,
    WithdrawalRequest,
)
from .services import (
    approve_deposit_request,
    approve_withdrawal_request,
    assign_deposit_request,
    mark_withdrawal_paid,
    reject_deposit_request,
    reject_withdrawal_request,
)


User = get_user_model()


class WalletFlowTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone="+959200000001", password="pass12345", name="Wallet User", role="user"
        )
        self.staff = User.objects.create_user(
            phone="+959200000002", password="pass12345", name="Staff One", role="staff"
        )
        # A wallet is auto-created for every user via a post_save signal.
        self.wallet = UserWallet.objects.get(user=self.user)
        self.wallet.balance = Decimal("0.00")
        self.wallet.locked_balance = Decimal("0.00")
        self.wallet.save(update_fields=["balance", "locked_balance"])

    def _deposit_request(self, amount, status=DepositRequest.Status.PENDING):
        return DepositRequest.objects.create(
            user=self.user,
            wallet=self.wallet,
            amount=Decimal(amount),
            status=status,
        )

    def _withdrawal_request(self, amount, status=WithdrawalRequest.Status.PENDING):
        return WithdrawalRequest.objects.create(
            user=self.user,
            wallet=self.wallet,
            amount=Decimal(amount),
            status=status,
        )


class DepositApprovalTests(WalletFlowTestCase):
    def test_approval_credits_wallet_and_records_transaction(self):
        request = self._deposit_request("50000")

        approve_deposit_request(request, self.staff)

        self.wallet.refresh_from_db()
        request.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("50000.00"))
        self.assertEqual(request.status, DepositRequest.Status.APPROVED)
        self.assertEqual(request.reviewed_by, self.staff)

        txn = WalletTransaction.objects.get(reference_id=request.id)
        self.assertEqual(txn.transaction_type, WalletTransaction.TransactionType.DEPOSIT)
        self.assertEqual(txn.balance_before, Decimal("0.00"))
        self.assertEqual(txn.balance_after, Decimal("50000.00"))

    def test_cannot_approve_twice(self):
        request = self._deposit_request("50000")
        approve_deposit_request(request, self.staff)

        with self.assertRaises(ValueError):
            approve_deposit_request(request, self.staff)

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("50000.00"))
        self.assertEqual(WalletTransaction.objects.count(), 1)

    def test_reject_does_not_touch_balance(self):
        request = self._deposit_request("50000")

        reject_deposit_request(request, self.staff, staff_note="Bad proof")

        self.wallet.refresh_from_db()
        request.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("0.00"))
        self.assertEqual(request.status, DepositRequest.Status.REJECTED)
        self.assertFalse(WalletTransaction.objects.exists())

    def test_assign_moves_to_in_review(self):
        request = self._deposit_request("10000")

        assign_deposit_request(request, self.staff)

        request.refresh_from_db()
        self.assertEqual(request.status, DepositRequest.Status.IN_REVIEW)
        self.assertEqual(request.assigned_to, self.staff)
        self.assertIsNotNone(request.assigned_at)


class WithdrawalFlowTests(WalletFlowTestCase):
    def setUp(self):
        super().setUp()
        self.wallet.balance = Decimal("100000.00")
        self.wallet.save(update_fields=["balance"])

    def test_approval_locks_funds(self):
        request = self._withdrawal_request("40000")

        approve_withdrawal_request(request, self.staff)

        self.wallet.refresh_from_db()
        request.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("60000.00"))
        self.assertEqual(self.wallet.locked_balance, Decimal("40000.00"))
        self.assertEqual(request.status, WithdrawalRequest.Status.APPROVED)

    def test_insufficient_balance_is_rejected(self):
        request = self._withdrawal_request("150000")

        with self.assertRaises(ValueError):
            approve_withdrawal_request(request, self.staff)

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("100000.00"))
        self.assertEqual(self.wallet.locked_balance, Decimal("0.00"))

    def test_reject_after_approval_unlocks_funds(self):
        request = self._withdrawal_request("40000")
        approve_withdrawal_request(request, self.staff)

        reject_withdrawal_request(request, self.staff, staff_note="Account mismatch")

        self.wallet.refresh_from_db()
        request.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("100000.00"))
        self.assertEqual(self.wallet.locked_balance, Decimal("0.00"))
        self.assertEqual(request.status, WithdrawalRequest.Status.REJECTED)

    def test_full_lifecycle_pay_reduces_total_funds(self):
        request = self._withdrawal_request("40000")
        approve_withdrawal_request(request, self.staff)

        mark_withdrawal_paid(request, self.staff)

        self.wallet.refresh_from_db()
        request.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("60000.00"))
        self.assertEqual(self.wallet.locked_balance, Decimal("0.00"))
        self.assertEqual(request.status, WithdrawalRequest.Status.PAID)
        self.assertEqual(request.paid_by, self.staff)

        txn = WalletTransaction.objects.get(
            reference_id=request.id,
            transaction_type=WalletTransaction.TransactionType.WITHDRAWAL,
        )
        self.assertEqual(txn.amount, Decimal("40000.00"))

    def test_cannot_pay_unapproved_withdrawal(self):
        request = self._withdrawal_request("40000")

        with self.assertRaises(ValueError):
            mark_withdrawal_paid(request, self.staff)

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.locked_balance, Decimal("0.00"))


class SystemSettingsApiTests(APITestCase):
    SETTINGS_URL = "/api/wallets/admin/settings/"
    DEPOSIT_URL = "/api/wallets/deposits/"

    def setUp(self):
        cache.clear()
        # Creating an owner seeds the default system settings via signal.
        self.owner = User.objects.create_user(
            phone="+959500000001", password="pass12345", name="Owner", role="owner"
        )
        self.member = User.objects.create_user(
            phone="+959500000002", password="pass12345", name="Member", role="user"
        )

    def tearDown(self):
        cache.clear()

    def _setting_id(self, key):
        return SystemSetting.objects.get(setting_key=key).id

    def test_list_requires_admin_or_owner(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(self.SETTINGS_URL).status_code, 403)

        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get(self.SETTINGS_URL).status_code, 200)

    def test_update_changes_value_and_validates(self):
        self.client.force_authenticate(self.owner)
        setting_id = self._setting_id("minimum_deposit")

        ok = self.client.patch(
            f"{self.SETTINGS_URL}{setting_id}/", {"setting_value": "5000"}, format="json"
        )
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(
            SystemSetting.objects.get(setting_key="minimum_deposit").setting_value, "5000"
        )

        bad = self.client.patch(
            f"{self.SETTINGS_URL}{setting_id}/", {"setting_value": "-1"}, format="json"
        )
        self.assertEqual(bad.status_code, 400)

    def test_deposit_export_csv(self):
        DepositRequest.objects.create(
            user=self.member,
            wallet=UserWallet.objects.get(user=self.member),
            amount=Decimal("25000.00"),
            status=DepositRequest.Status.PENDING,
        )
        url = "/api/wallets/admin/deposits/export/"

        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(url).status_code, 403)

        self.client.force_authenticate(self.owner)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv")
        body = b"".join(response.streaming_content).decode()
        self.assertIn("Created,User,Phone,Amount", body)
        self.assertIn("25000.00", body)

    def test_deposit_minimum_follows_setting(self):
        # Raise the minimum, then a below-minimum deposit request is rejected.
        SystemSetting.objects.filter(setting_key="minimum_deposit").update(
            setting_value="5000"
        )
        self.client.force_authenticate(self.member)

        response = self.client.post(
            self.DEPOSIT_URL, {"amount": "3000"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
