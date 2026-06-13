from datetime import date, datetime, time

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from company.models import CompanyWalletTransaction
from ledgers.models import Ledger, LedgerNumber, LedgerPriorityHistory, ResultPeriod
from receipts.models import PaidNumberAllocation, RGeneratedGroup, RGeneratedItem, Receipt, ReceiptItem
from settlements.models import SettlementBatch, SettlementItem, SettlementItemSource
from wallets.models import UserWallet, WalletTransaction
from ._dev_db import ensure_dev_database_ready


class Command(BaseCommand):
    help = "Create or reset the TEST02 full-flow test result period and ledger."

    RESULT_PERIOD_CODE = "TEST02"
    RESULT_PERIOD_NAME = "Test Period 02"
    LEDGER_NAME = "Test Ledger 02"
    RESULT_DATE = date(2026, 6, 30)
    DEFAULT_CLOSE_TIME = time(15, 0, 0)

    def handle(self, *args, **options):
        ensure_dev_database_ready(self.stdout)

        owner_user = User.objects.filter(role=User.Role.OWNER).order_by("id").first()

        if not owner_user:
            self.stdout.write(self.style.ERROR("No owner user found."))
            return

        with transaction.atomic():
            result_period, created = self._prepare_result_period(owner_user)
            ledger = self._create_test_ledger(result_period, owner_user)
            ledger_number_count = LedgerNumber.objects.filter(ledger=ledger).count()

        action = "created" if created else "reset"
        self.stdout.write(
            self.style.SUCCESS(f"TEST02 test period {action} successfully.")
        )
        self.stdout.write(f"Result Period ID: {result_period.id}")
        self.stdout.write(f"Ledger ID: {ledger.id}")
        self.stdout.write(f"Ledger Number Count: {ledger_number_count}")

    def _prepare_result_period(self, owner_user):
        result_period = (
            ResultPeriod.objects
            .select_for_update()
            .filter(code=self.RESULT_PERIOD_CODE)
            .first()
        )

        if result_period:
            self._reset_existing_test_period(result_period)

            result_period.name = self.RESULT_PERIOD_NAME
            result_period.result_date = self.RESULT_DATE
            result_period.default_close_time = self.DEFAULT_CLOSE_TIME
            result_period.status = ResultPeriod.Status.OPEN
            result_period.result_number = None
            result_period.result_source = ResultPeriod.ResultSource.MANUAL
            result_period.is_visible_to_users = True
            result_period.result_entered_by = None
            result_period.result_entered_at = None
            result_period.result_voided_by = None
            result_period.result_voided_at = None
            result_period.result_void_reason = None
            result_period.created_by = owner_user
            result_period.save(
                update_fields=[
                    "name",
                    "result_date",
                    "default_close_time",
                    "status",
                    "result_number",
                    "result_source",
                    "is_visible_to_users",
                    "result_entered_by",
                    "result_entered_at",
                    "result_voided_by",
                    "result_voided_at",
                    "result_void_reason",
                    "created_by",
                    "updated_at",
                ]
            )
            return result_period, False

        result_period = ResultPeriod.objects.create(
            code=self.RESULT_PERIOD_CODE,
            name=self.RESULT_PERIOD_NAME,
            result_date=self.RESULT_DATE,
            default_close_time=self.DEFAULT_CLOSE_TIME,
            status=ResultPeriod.Status.OPEN,
            result_number=None,
            result_source=ResultPeriod.ResultSource.MANUAL,
            is_visible_to_users=True,
            created_by=owner_user,
        )
        return result_period, True

    def _create_test_ledger(self, result_period, owner_user):
        open_at = self._make_aware_datetime(self.RESULT_DATE, time(0, 0, 0))
        close_at = self._make_aware_datetime(
            self.RESULT_DATE,
            self.DEFAULT_CLOSE_TIME,
        )

        return Ledger.objects.create(
            result_period=result_period,
            name=self.LEDGER_NAME,
            capacity_per_number="800000",
            settlement_rate="700",
            priority_order=1,
            open_at=open_at,
            close_at=close_at,
            status=Ledger.Status.OPEN,
            created_by=owner_user,
        )

    def _reset_existing_test_period(self, result_period):
        self._reset_settlement_data(result_period)
        self._reset_receipt_data(result_period)
        self._reset_ledger_data(result_period)

    def _reset_settlement_data(self, result_period):
        settlement_batches = list(
            SettlementBatch.objects
            .select_for_update()
            .filter(result_period=result_period)
        )

        for batch in settlement_batches:
            settlement_items = list(
                SettlementItem.objects
                .select_related("wallet_transaction")
                .filter(settlement_batch=batch)
            )
            settlement_wallet_transactions = []

            for item in settlement_items:
                if not item.wallet_transaction_id:
                    continue

                wallet_tx = item.wallet_transaction
                wallet = UserWallet.objects.select_for_update().get(id=wallet_tx.wallet_id)
                wallet.balance -= wallet_tx.amount
                wallet.save(update_fields=["balance", "updated_at"])
                settlement_wallet_transactions.append(wallet_tx)

            funding_transactions = list(
                CompanyWalletTransaction.objects
                .select_related("company_wallet")
                .filter(
                    transaction_type=CompanyWalletTransaction.TransactionType.SETTLEMENT_FUNDING,
                    reference_table="settlement_batches",
                    reference_id=batch.id,
                )
            )

            for funding_tx in funding_transactions:
                company_wallet = funding_tx.company_wallet
                company_wallet.balance += funding_tx.amount
                company_wallet.save(update_fields=["balance", "updated_at"])
                funding_tx.delete()

            SettlementItemSource.objects.filter(
                settlement_item__settlement_batch=batch
            ).delete()
            SettlementItem.objects.filter(settlement_batch=batch).delete()

            for wallet_tx in settlement_wallet_transactions:
                wallet_tx.delete()

            batch.delete()

    def _reset_receipt_data(self, result_period):
        receipt_ids = list(
            Receipt.objects
            .select_for_update()
            .filter(result_period=result_period)
            .values_list("id", flat=True)
        )

        if not receipt_ids:
            return

        payment_transactions = list(
            WalletTransaction.objects
            .select_related("wallet")
            .filter(
                transaction_type=WalletTransaction.TransactionType.NUMBER_PAYMENT,
                reference_table="receipts",
                reference_id__in=receipt_ids,
            )
        )

        for wallet_tx in payment_transactions:
            wallet = UserWallet.objects.select_for_update().get(id=wallet_tx.wallet_id)
            wallet.balance += wallet_tx.amount
            wallet.save(update_fields=["balance", "updated_at"])
            wallet_tx.delete()

        PaidNumberAllocation.objects.filter(
            receipt_item__receipt_id__in=receipt_ids
        ).delete()
        RGeneratedItem.objects.filter(group__receipt_id__in=receipt_ids).delete()
        RGeneratedGroup.objects.filter(receipt_id__in=receipt_ids).delete()
        ReceiptItem.objects.filter(receipt_id__in=receipt_ids).delete()
        Receipt.objects.filter(id__in=receipt_ids).delete()

    def _reset_ledger_data(self, result_period):
        ledger_ids = list(
            result_period.ledgers.values_list("id", flat=True)
        )

        if not ledger_ids:
            return

        LedgerPriorityHistory.objects.filter(ledger_id__in=ledger_ids).delete()
        LedgerNumber.objects.filter(ledger_id__in=ledger_ids).delete()
        Ledger.objects.filter(id__in=ledger_ids).delete()

    def _make_aware_datetime(self, value_date, value_time):
        combined = datetime.combine(value_date, value_time)
        if timezone.is_naive(combined):
            return timezone.make_aware(combined, timezone.get_current_timezone())
        return combined
