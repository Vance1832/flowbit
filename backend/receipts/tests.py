from datetime import time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from ledgers.models import Ledger, LedgerNumber, ResultPeriod
from wallets.models import UserWallet
from .models import Receipt, ReceiptItem
from .services import create_paid_receipt


User = get_user_model()


class ReceiptPdfTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959600000001", password="pass12345", name="Owner", role="owner"
        )
        self.player = User.objects.create_user(
            phone="+959600000002", password="pass12345", name="Receipt Player", role="user"
        )
        self.other = User.objects.create_user(
            phone="+959600000003", password="pass12345", name="Other Player", role="user"
        )

        now = timezone.now()
        period = ResultPeriod.objects.create(
            code="RC-01",
            name="Receipt Period",
            result_date=now.date(),
            default_close_time=time(15, 0),
            status=ResultPeriod.Status.CLOSED,
            created_by=self.owner,
        )
        self.receipt = Receipt.objects.create(
            receipt_no="FB-RC01-000001",
            user=self.player,
            result_period=period,
            total_amount=Decimal("3000.00"),
            status=Receipt.Status.PAID,
            paid_at=now,
        )
        ReceiptItem.objects.create(
            receipt=self.receipt, number_code="124", amount=Decimal("3000.00")
        )

    def _pdf_url(self):
        return f"/api/receipts/{self.receipt.id}/pdf/"

    def test_requires_authentication(self):
        self.assertEqual(self.client.get(self._pdf_url()).status_code, 401)

    def test_owner_of_receipt_downloads_pdf(self):
        self.client.force_authenticate(self.player)
        response = self.client.get(self._pdf_url())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("FB-RC01-000001.pdf", response["Content-Disposition"])
        self.assertTrue(response.content.startswith(b"%PDF-"))

    def test_other_user_cannot_download(self):
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self._pdf_url()).status_code, 404)

    def test_admin_can_download_any_receipt(self):
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get(self._pdf_url()).status_code, 200)


class BettingWindowTests(TestCase):
    """Submission must respect each ledger's [open_at, close_at) window."""

    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959610000001", password="pass12345", name="Owner", role="owner"
        )
        self.player = User.objects.create_user(
            phone="+959610000002", password="pass12345", name="Player", role="user"
        )
        # Wallet is auto-created via signal; fund it for submissions.
        wallet = UserWallet.objects.get(user=self.player)
        wallet.balance = Decimal("100000.00")
        wallet.save(update_fields=["balance"])

        now = timezone.now()
        self.period = ResultPeriod.objects.create(
            code="WIN-01",
            name="Window Test Period",
            result_date=now.date(),
            default_close_time=time(15, 0),
            status=ResultPeriod.Status.OPEN,
            created_by=self.owner,
        )

    def _make_ledger(self, open_at, close_at, status=Ledger.Status.OPEN):
        # LedgerNumber rows (000-999) are auto-seeded by a post_save signal.
        return Ledger.objects.create(
            result_period=self.period,
            name="Primary",
            capacity_per_number=Decimal("1000000.00"),
            settlement_rate=Decimal("700.00"),
            priority_order=1,
            open_at=open_at,
            close_at=close_at,
            status=status,
            created_by=self.owner,
        )

    def _submit(self):
        return create_paid_receipt(
            user=self.player,
            result_period=self.period,
            raw_items=[{"number_code": "124", "amount": "1000"}],
        )

    def test_submission_inside_window_succeeds(self):
        now = timezone.now()
        self._make_ledger(now - timedelta(hours=2), now + timedelta(hours=2))

        receipt = self._submit()

        self.assertEqual(receipt.total_amount, Decimal("1000.00"))
        ln = LedgerNumber.objects.get(ledger__result_period=self.period, number_code="124")
        self.assertEqual(ln.used_amount, Decimal("1000.00"))

    def test_submission_after_close_at_is_rejected(self):
        now = timezone.now()
        # Window already elapsed, but the ledger is still marked OPEN.
        self._make_ledger(now - timedelta(hours=3), now - timedelta(minutes=1))

        with self.assertRaisesMessage(ValueError, "Betting is closed for this period."):
            self._submit()

        # No wallet was debited and no capacity consumed.
        self.assertEqual(UserWallet.objects.get(user=self.player).balance, Decimal("100000.00"))
        ln = LedgerNumber.objects.get(ledger__result_period=self.period, number_code="124")
        self.assertEqual(ln.used_amount, Decimal("0.00"))

    def test_submission_before_open_at_is_rejected(self):
        now = timezone.now()
        self._make_ledger(now + timedelta(minutes=10), now + timedelta(hours=2))

        with self.assertRaisesMessage(ValueError, "Betting is closed for this period."):
            self._submit()

    def test_auto_close_command_closes_expired_ledger(self):
        now = timezone.now()
        expired = self._make_ledger(now - timedelta(hours=3), now - timedelta(minutes=1))
        live = self._make_ledger(now - timedelta(hours=1), now + timedelta(hours=1))

        call_command("close_expired_ledgers")

        expired.refresh_from_db()
        live.refresh_from_db()
        self.assertEqual(expired.status, Ledger.Status.CLOSED)
        self.assertEqual(live.status, Ledger.Status.OPEN)

    def test_auto_close_dry_run_changes_nothing(self):
        now = timezone.now()
        expired = self._make_ledger(now - timedelta(hours=3), now - timedelta(minutes=1))

        call_command("close_expired_ledgers", "--dry-run")

        expired.refresh_from_db()
        self.assertEqual(expired.status, Ledger.Status.OPEN)
