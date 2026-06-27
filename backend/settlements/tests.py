from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from company.models import CompanyWallet, CompanyWalletTransaction
from ledgers.models import Ledger, ResultPeriod
from receipts.models import Receipt, ReceiptItem
from settlements.models import SettlementBatch, SettlementItem
from settlements.services import (
    approve_settlement,
    create_settlement_preview,
    void_settlement,
)
from wallets.models import UserWallet, WalletTransaction


User = get_user_model()

RESULT_NUMBER = "124"
SETTLEMENT_RATE = Decimal("80.00")


class SettlementTestCase(APITestCase):
    def setUp(self):
        # Creating an owner triggers the default company wallet via signal.
        self.owner = User.objects.create_user(
            phone="+959300000001", password="pass12345", name="Owner", role="owner"
        )
        self.winner = User.objects.create_user(
            phone="+959300000002", password="pass12345", name="Winner", role="user"
        )
        self.loser = User.objects.create_user(
            phone="+959300000003", password="pass12345", name="Loser", role="user"
        )

        now = timezone.now()
        self.period = ResultPeriod.objects.create(
            code="TEST-SET-01",
            name="Settlement Test Period",
            result_date=now.date(),
            default_close_time=now.time(),
            status=ResultPeriod.Status.CLOSED,
            created_by=self.owner,
        )
        Ledger.objects.create(
            result_period=self.period,
            name="Primary Ledger",
            capacity_per_number=Decimal("1000000.00"),
            settlement_rate=SETTLEMENT_RATE,
            priority_order=1,
            open_at=now - timedelta(hours=2),
            close_at=now,
            created_by=self.owner,
        )

        self.company_wallet = CompanyWallet.objects.first()

    def _set_company_balance(self, amount):
        self.company_wallet.balance = Decimal(amount)
        self.company_wallet.save(update_fields=["balance"])

    def _make_receipt(self, user, total_amount, items, receipt_no):
        receipt = Receipt.objects.create(
            receipt_no=receipt_no,
            user=user,
            result_period=self.period,
            total_amount=Decimal(total_amount),
            status=Receipt.Status.PAID,
            paid_at=timezone.now(),
        )
        for number_code, amount in items:
            ReceiptItem.objects.create(
                receipt=receipt,
                number_code=number_code,
                amount=Decimal(amount),
            )
        return receipt

    def _wallet(self, user):
        return UserWallet.objects.get(user=user)


class SettlementPreviewTests(SettlementTestCase):
    def test_profitable_preview_requires_no_reserve(self):
        # Collected 10000, one winning bet of 50 -> settlement 4000, profit 6000.
        self._make_receipt(self.winner, "5000", [(RESULT_NUMBER, "50")], "R-WIN-1")
        self._make_receipt(self.loser, "5000", [("999", "50")], "R-LOSE-1")

        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)

        self.assertEqual(batch.status, SettlementBatch.Status.PREVIEWED)
        self.assertEqual(batch.total_collected, Decimal("10000.00"))
        self.assertEqual(batch.total_settlement, Decimal("4000.00"))
        self.assertEqual(batch.final_profit_loss, Decimal("6000.00"))
        self.assertEqual(batch.company_reserve_required, Decimal("0.00"))
        # Only the winner gets a settlement item.
        self.assertEqual(batch.items.count(), 1)
        self.assertEqual(batch.items.first().user, self.winner)

    def test_loss_preview_flags_reserve_when_underfunded(self):
        self._set_company_balance("1000")
        # Collected 1000, winning bet 50 -> settlement 4000, loss 3000 > reserve.
        self._make_receipt(self.winner, "1000", [(RESULT_NUMBER, "50")], "R-WIN-2")

        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)

        self.assertEqual(batch.company_reserve_required, Decimal("3000.00"))
        self.assertEqual(batch.status, SettlementBatch.Status.FUNDING_REQUIRED)

    def test_duplicate_preview_is_rejected(self):
        self._make_receipt(self.winner, "5000", [(RESULT_NUMBER, "50")], "R-WIN-3")
        create_settlement_preview(self.period, RESULT_NUMBER, self.owner)

        with self.assertRaises(ValueError):
            create_settlement_preview(self.period, RESULT_NUMBER, self.owner)

    def test_invalid_result_number_is_rejected(self):
        with self.assertRaises(ValueError):
            create_settlement_preview(self.period, "12", self.owner)


class SettlementApprovalTests(SettlementTestCase):
    def test_profit_approval_credits_only_winners(self):
        self._make_receipt(self.winner, "5000", [(RESULT_NUMBER, "50")], "R-WIN-1")
        self._make_receipt(self.loser, "5000", [("999", "50")], "R-LOSE-1")
        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)

        approve_settlement(batch, self.owner)

        batch.refresh_from_db()
        self.assertEqual(batch.status, SettlementBatch.Status.PAID)
        self.assertEqual(self._wallet(self.winner).balance, Decimal("4000.00"))
        self.assertEqual(self._wallet(self.loser).balance, Decimal("0.00"))

        txn = WalletTransaction.objects.get(
            user=self.winner,
            transaction_type=WalletTransaction.TransactionType.SETTLEMENT_CREDIT,
        )
        self.assertEqual(txn.amount, Decimal("4000.00"))
        self.assertEqual(batch.items.first().status, SettlementItem.Status.PAID)

    def test_loss_approval_debits_company_reserve(self):
        self._set_company_balance("5000")
        self._make_receipt(self.winner, "1000", [(RESULT_NUMBER, "50")], "R-WIN-2")
        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)
        self.assertEqual(batch.status, SettlementBatch.Status.PREVIEWED)

        approve_settlement(batch, self.owner)

        batch.refresh_from_db()
        self.company_wallet.refresh_from_db()
        self.assertEqual(batch.company_reserve_used, Decimal("3000.00"))
        self.assertEqual(self.company_wallet.balance, Decimal("2000.00"))
        self.assertEqual(self._wallet(self.winner).balance, Decimal("4000.00"))
        self.assertTrue(
            CompanyWalletTransaction.objects.filter(
                reference_table="settlement_batches", reference_id=batch.id
            ).exists()
        )

    def test_insufficient_reserve_blocks_approval(self):
        self._set_company_balance("1000")
        self._make_receipt(self.winner, "1000", [(RESULT_NUMBER, "50")], "R-WIN-3")
        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)

        with self.assertRaises(ValueError):
            approve_settlement(batch, self.owner)

        batch.refresh_from_db()
        self.company_wallet.refresh_from_db()
        self.assertNotEqual(batch.status, SettlementBatch.Status.PAID)
        self.assertEqual(self.company_wallet.balance, Decimal("1000.00"))
        self.assertEqual(self._wallet(self.winner).balance, Decimal("0.00"))

    def test_cannot_approve_twice(self):
        self._make_receipt(self.winner, "5000", [(RESULT_NUMBER, "50")], "R-WIN-4")
        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)
        approve_settlement(batch, self.owner)

        with self.assertRaises(ValueError):
            approve_settlement(batch, self.owner)

        self.assertEqual(self._wallet(self.winner).balance, Decimal("4000.00"))


class SettlementVoidTests(SettlementTestCase):
    def test_void_paid_settlement_reverses_wallets_and_reserve(self):
        self._set_company_balance("5000")
        self._make_receipt(self.winner, "1000", [(RESULT_NUMBER, "50")], "R-WIN-V1")
        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)
        approve_settlement(batch, self.owner)
        # Sanity: winner credited, reserve used.
        self.assertEqual(self._wallet(self.winner).balance, Decimal("4000.00"))

        void_settlement(batch, self.owner, reason="Wrong result number entered")

        batch.refresh_from_db()
        self.company_wallet.refresh_from_db()
        self.period.refresh_from_db()

        self.assertEqual(batch.status, SettlementBatch.Status.VOIDED)
        self.assertEqual(batch.voided_by, self.owner)
        # Winner clawed back, company reserve refunded.
        self.assertEqual(self._wallet(self.winner).balance, Decimal("0.00"))
        self.assertEqual(self.company_wallet.balance, Decimal("5000.00"))
        # Reversal transactions recorded.
        self.assertTrue(
            WalletTransaction.objects.filter(
                user=self.winner,
                transaction_type=WalletTransaction.TransactionType.ADJUSTMENT,
            ).exists()
        )
        self.assertTrue(
            CompanyWalletTransaction.objects.filter(
                transaction_type=CompanyWalletTransaction.TransactionType.ADJUSTMENT,
                reference_table="settlement_batches",
                reference_id=batch.id,
            ).exists()
        )
        # Items voided; period reset for re-entry.
        self.assertTrue(
            all(i.status == SettlementItem.Status.VOIDED for i in batch.items.all())
        )
        self.assertIsNone(self.period.result_number)
        self.assertEqual(self.period.status, ResultPeriod.Status.CLOSED)
        self.assertEqual(self.period.result_void_reason, "Wrong result number entered")

    def test_void_requires_reason(self):
        self._make_receipt(self.winner, "5000", [(RESULT_NUMBER, "50")], "R-WIN-V2")
        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)

        with self.assertRaises(ValueError):
            void_settlement(batch, self.owner, reason="   ")

    def test_cannot_void_twice(self):
        self._make_receipt(self.winner, "5000", [(RESULT_NUMBER, "50")], "R-WIN-V3")
        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)
        void_settlement(batch, self.owner, reason="First void")

        with self.assertRaises(ValueError):
            void_settlement(batch, self.owner, reason="Second void")

    def test_void_previewed_batch_makes_no_wallet_changes(self):
        self._make_receipt(self.winner, "5000", [(RESULT_NUMBER, "50")], "R-WIN-V4")
        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)

        void_settlement(batch, self.owner, reason="Voided before approval")

        self.assertEqual(self._wallet(self.winner).balance, Decimal("0.00"))
        self.assertFalse(
            WalletTransaction.objects.filter(user=self.winner).exists()
        )

    def test_settlements_export_csv(self):
        self._make_receipt(self.winner, "5000", [(RESULT_NUMBER, "50")], "R-EXP-1")
        create_settlement_preview(self.period, RESULT_NUMBER, self.owner)
        url = "/api/settlements/admin/batches/export/"

        self.client.force_authenticate(self.winner)
        self.assertEqual(self.client.get(url).status_code, 403)

        self.client.force_authenticate(self.owner)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv")
        body = b"".join(response.streaming_content).decode()
        self.assertIn("Period,Result Number,Collected,Settlement,Profit/Loss", body)
        self.assertIn(self.period.code, body)


class SettlementReEntryTests(SettlementTestCase):
    def test_re_entry_allowed_after_void(self):
        self._make_receipt(self.winner, "5000", [(RESULT_NUMBER, "50")], "R-WIN-V5")
        batch = create_settlement_preview(self.period, RESULT_NUMBER, self.owner)
        void_settlement(batch, self.owner, reason="Correcting result")

        # A fresh preview can be created once the prior batch is voided.
        new_batch = create_settlement_preview(self.period, "999", self.owner)
        self.assertEqual(new_batch.status, SettlementBatch.Status.PREVIEWED)
        self.assertNotEqual(new_batch.id, batch.id)
