from collections import OrderedDict

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from accounts.models import User
from audit.models import AuditLog
from company.models import CompanyWalletTransaction
from ledgers.models import Ledger, LedgerNumber, LedgerPriorityHistory, ResultPeriod
from notifications.models import Notification
from receipts.models import PaidNumberAllocation, RGeneratedGroup, RGeneratedItem, Receipt, ReceiptItem
from settlements.models import SettlementBatch, SettlementItem, SettlementItemSource
from wallets.models import DepositRequest, UserWallet, WalletTransaction, WithdrawalRequest


class Command(BaseCommand):
    help = "Dry-run or delete local development test data tied to TEST* periods and known test users."

    TEST_PHONES = {
        "+95912345678",
        "+959777777777",
    }
    TEST_USER_NAMES = {
        "Flow Test User",
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Actually delete the matched test data. Without this flag, the command is a dry run only.",
        )

    def handle(self, *args, **options):
        confirm = options["confirm"]
        plan = self._build_cleanup_plan()

        mode = "DELETE" if confirm else "DRY RUN"
        self.stdout.write(self.style.WARNING(f"{mode}: clean_test_data"))
        self.stdout.write("Matched test result periods: " + ", ".join(plan["result_period_codes"]) if plan["result_period_codes"] else "Matched test result periods: none")
        self.stdout.write("Matched test users: " + ", ".join(plan["test_user_phones"]) if plan["test_user_phones"] else "Matched test users: none")

        self.stdout.write("")
        self.stdout.write("Delete summary:")
        for model_label, count in plan["summary"].items():
            self.stdout.write(f"- {model_label}: {count}")

        if not confirm:
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS("Dry run complete. Re-run with --confirm to delete these records."))
            return

        with transaction.atomic():
            self._execute_cleanup(plan)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Test data cleanup completed successfully."))

    def _build_cleanup_plan(self):
        protected_roles = [
            User.Role.OWNER,
            User.Role.ADMIN,
            User.Role.STAFF,
        ]

        test_users = User.objects.filter(
            Q(phone__in=self.TEST_PHONES) | Q(name__in=self.TEST_USER_NAMES)
        ).exclude(role__in=protected_roles)
        test_user_ids = list(test_users.values_list("id", flat=True))

        result_periods = ResultPeriod.objects.filter(code__startswith="TEST")
        result_period_ids = list(result_periods.values_list("id", flat=True))
        result_period_codes = list(result_periods.values_list("code", flat=True))

        ledgers = Ledger.objects.filter(result_period_id__in=result_period_ids)
        ledger_ids = list(ledgers.values_list("id", flat=True))

        ledger_numbers = LedgerNumber.objects.filter(ledger_id__in=ledger_ids)
        ledger_number_ids = list(ledger_numbers.values_list("id", flat=True))

        ledger_priority_histories = LedgerPriorityHistory.objects.filter(ledger_id__in=ledger_ids)
        ledger_priority_history_ids = list(
            ledger_priority_histories.values_list("id", flat=True)
        )

        receipts = Receipt.objects.filter(
            Q(result_period_id__in=result_period_ids) | Q(user_id__in=test_user_ids)
        )
        receipt_ids = list(receipts.values_list("id", flat=True))

        receipt_items = ReceiptItem.objects.filter(receipt_id__in=receipt_ids)
        receipt_item_ids = list(receipt_items.values_list("id", flat=True))

        paid_allocations = PaidNumberAllocation.objects.filter(receipt_item_id__in=receipt_item_ids)
        paid_allocation_ids = list(paid_allocations.values_list("id", flat=True))

        r_generated_groups = RGeneratedGroup.objects.filter(receipt_id__in=receipt_ids)
        r_generated_group_ids = list(r_generated_groups.values_list("id", flat=True))

        r_generated_items = RGeneratedItem.objects.filter(
            Q(group_id__in=r_generated_group_ids) | Q(receipt_item_id__in=receipt_item_ids)
        )
        r_generated_item_ids = list(r_generated_items.values_list("id", flat=True))

        settlement_batches = SettlementBatch.objects.filter(result_period_id__in=result_period_ids)
        settlement_batch_ids = list(settlement_batches.values_list("id", flat=True))

        settlement_items = SettlementItem.objects.filter(settlement_batch_id__in=settlement_batch_ids)
        settlement_item_ids = list(settlement_items.values_list("id", flat=True))

        settlement_item_sources = SettlementItemSource.objects.filter(
            settlement_item_id__in=settlement_item_ids
        )
        settlement_item_source_ids = list(
            settlement_item_sources.values_list("id", flat=True)
        )

        deposit_requests = DepositRequest.objects.filter(user_id__in=test_user_ids)
        deposit_request_ids = list(deposit_requests.values_list("id", flat=True))

        withdrawal_requests = WithdrawalRequest.objects.filter(user_id__in=test_user_ids)
        withdrawal_request_ids = list(withdrawal_requests.values_list("id", flat=True))

        receipt_payment_wallet_txs = WalletTransaction.objects.filter(
            transaction_type=WalletTransaction.TransactionType.NUMBER_PAYMENT,
            reference_table="receipts",
            reference_id__in=receipt_ids,
        )
        receipt_payment_wallet_tx_ids = list(
            receipt_payment_wallet_txs.values_list("id", flat=True)
        )

        settlement_credit_wallet_txs = WalletTransaction.objects.filter(
            transaction_type=WalletTransaction.TransactionType.SETTLEMENT_CREDIT,
            reference_table="settlement_items",
            reference_id__in=settlement_item_ids,
        )
        settlement_credit_wallet_tx_ids = list(
            settlement_credit_wallet_txs.values_list("id", flat=True)
        )

        test_user_wallet_txs = WalletTransaction.objects.filter(user_id__in=test_user_ids)
        test_user_wallet_tx_ids = list(test_user_wallet_txs.values_list("id", flat=True))

        wallet_transaction_ids = sorted(
            set(
                receipt_payment_wallet_tx_ids
                + settlement_credit_wallet_tx_ids
                + test_user_wallet_tx_ids
            )
        )

        notifications = Notification.objects.filter(
            Q(user_id__in=test_user_ids)
            | Q(reference_table="receipts", reference_id__in=receipt_ids)
            | Q(reference_table="settlement_items", reference_id__in=settlement_item_ids)
            | Q(reference_table="deposit_requests", reference_id__in=deposit_request_ids)
            | Q(reference_table="withdrawal_requests", reference_id__in=withdrawal_request_ids)
        )
        notification_ids = list(notifications.values_list("id", flat=True))

        settlement_funding_company_txs = CompanyWalletTransaction.objects.filter(
            transaction_type=CompanyWalletTransaction.TransactionType.SETTLEMENT_FUNDING,
            reference_table="settlement_batches",
            reference_id__in=settlement_batch_ids,
        )
        settlement_funding_company_tx_ids = list(
            settlement_funding_company_txs.values_list("id", flat=True)
        )

        test_reserve_company_txs = CompanyWalletTransaction.objects.filter(
            transaction_type=CompanyWalletTransaction.TransactionType.RESERVE_DEPOSIT,
            description__startswith="Test reserve top-up for TEST",
        )
        test_reserve_company_tx_ids = list(
            test_reserve_company_txs.values_list("id", flat=True)
        )

        company_wallet_transaction_ids = sorted(
            set(settlement_funding_company_tx_ids + test_reserve_company_tx_ids)
        )

        audit_logs = AuditLog.objects.filter(
            Q(actor_user_id__in=test_user_ids)
            | Q(target_table="result_periods", target_id__in=result_period_ids)
            | Q(target_table="settlement_batches", target_id__in=settlement_batch_ids)
            | Q(target_table="settlement_items", target_id__in=settlement_item_ids)
            | Q(target_table="receipts", target_id__in=receipt_ids)
            | Q(target_table="deposit_requests", target_id__in=deposit_request_ids)
            | Q(target_table="withdrawal_requests", target_id__in=withdrawal_request_ids)
            | Q(target_table="wallet_transactions", target_id__in=wallet_transaction_ids)
            | Q(target_table="company_wallet_transactions", target_id__in=company_wallet_transaction_ids)
        )
        audit_log_ids = list(audit_logs.values_list("id", flat=True))

        wallets = UserWallet.objects.filter(user_id__in=test_user_ids)
        wallet_ids = list(wallets.values_list("id", flat=True))

        summary = OrderedDict([
            ("AuditLog", len(audit_log_ids)),
            ("Notification", len(notification_ids)),
            ("SettlementItemSource", len(settlement_item_source_ids)),
            ("SettlementItem", len(settlement_item_ids)),
            ("SettlementBatch", len(settlement_batch_ids)),
            ("PaidNumberAllocation", len(paid_allocation_ids)),
            ("RGeneratedItem", len(r_generated_item_ids)),
            ("RGeneratedGroup", len(r_generated_group_ids)),
            ("ReceiptItem", len(receipt_item_ids)),
            ("Receipt", len(receipt_ids)),
            ("CompanyWalletTransaction", len(company_wallet_transaction_ids)),
            ("LedgerPriorityHistory", len(ledger_priority_history_ids)),
            ("LedgerNumber", len(ledger_number_ids)),
            ("Ledger", len(ledger_ids)),
            ("ResultPeriod", len(result_period_ids)),
            ("DepositRequest", len(deposit_request_ids)),
            ("WithdrawalRequest", len(withdrawal_request_ids)),
            ("WalletTransaction", len(wallet_transaction_ids)),
            ("UserWallet", len(wallet_ids)),
            ("User", len(test_user_ids)),
        ])

        return {
            "test_user_ids": test_user_ids,
            "test_user_phones": list(test_users.values_list("phone", flat=True)),
            "result_period_ids": result_period_ids,
            "result_period_codes": result_period_codes,
            "ledger_ids": ledger_ids,
            "ledger_number_ids": ledger_number_ids,
            "ledger_priority_history_ids": ledger_priority_history_ids,
            "receipt_ids": receipt_ids,
            "receipt_item_ids": receipt_item_ids,
            "paid_allocation_ids": paid_allocation_ids,
            "r_generated_group_ids": r_generated_group_ids,
            "r_generated_item_ids": r_generated_item_ids,
            "settlement_batch_ids": settlement_batch_ids,
            "settlement_item_ids": settlement_item_ids,
            "settlement_item_source_ids": settlement_item_source_ids,
            "deposit_request_ids": deposit_request_ids,
            "withdrawal_request_ids": withdrawal_request_ids,
            "wallet_transaction_ids": wallet_transaction_ids,
            "receipt_payment_wallet_tx_ids": receipt_payment_wallet_tx_ids,
            "settlement_credit_wallet_tx_ids": settlement_credit_wallet_tx_ids,
            "company_wallet_transaction_ids": company_wallet_transaction_ids,
            "settlement_funding_company_tx_ids": settlement_funding_company_tx_ids,
            "test_reserve_company_tx_ids": test_reserve_company_tx_ids,
            "notification_ids": notification_ids,
            "audit_log_ids": audit_log_ids,
            "wallet_ids": wallet_ids,
            "summary": summary,
        }

    def _execute_cleanup(self, plan):
        self._reverse_wallet_balances(plan["settlement_credit_wallet_tx_ids"], subtract=True)
        self._reverse_wallet_balances(plan["receipt_payment_wallet_tx_ids"], subtract=False)
        self._reverse_company_balances(plan["settlement_funding_company_tx_ids"], add_back=True)
        self._reverse_company_balances(plan["test_reserve_company_tx_ids"], add_back=False)

        AuditLog.objects.filter(id__in=plan["audit_log_ids"]).delete()
        Notification.objects.filter(id__in=plan["notification_ids"]).delete()
        SettlementItemSource.objects.filter(id__in=plan["settlement_item_source_ids"]).delete()
        SettlementItem.objects.filter(id__in=plan["settlement_item_ids"]).delete()
        SettlementBatch.objects.filter(id__in=plan["settlement_batch_ids"]).delete()
        PaidNumberAllocation.objects.filter(id__in=plan["paid_allocation_ids"]).delete()
        RGeneratedItem.objects.filter(id__in=plan["r_generated_item_ids"]).delete()
        RGeneratedGroup.objects.filter(id__in=plan["r_generated_group_ids"]).delete()
        ReceiptItem.objects.filter(id__in=plan["receipt_item_ids"]).delete()
        Receipt.objects.filter(id__in=plan["receipt_ids"]).delete()
        CompanyWalletTransaction.objects.filter(id__in=plan["company_wallet_transaction_ids"]).delete()
        LedgerPriorityHistory.objects.filter(id__in=plan["ledger_priority_history_ids"]).delete()
        LedgerNumber.objects.filter(id__in=plan["ledger_number_ids"]).delete()
        Ledger.objects.filter(id__in=plan["ledger_ids"]).delete()
        ResultPeriod.objects.filter(id__in=plan["result_period_ids"]).delete()
        DepositRequest.objects.filter(id__in=plan["deposit_request_ids"]).delete()
        WithdrawalRequest.objects.filter(id__in=plan["withdrawal_request_ids"]).delete()
        WalletTransaction.objects.filter(id__in=plan["wallet_transaction_ids"]).delete()
        UserWallet.objects.filter(id__in=plan["wallet_ids"]).delete()
        User.objects.filter(id__in=plan["test_user_ids"]).delete()

    def _reverse_wallet_balances(self, wallet_transaction_ids, subtract):
        wallet_transactions = WalletTransaction.objects.select_related("wallet").filter(
            id__in=wallet_transaction_ids
        )
        for wallet_tx in wallet_transactions:
            wallet = wallet_tx.wallet
            if subtract:
                wallet.balance -= wallet_tx.amount
            else:
                wallet.balance += wallet_tx.amount
            wallet.save(update_fields=["balance", "updated_at"])

    def _reverse_company_balances(self, company_transaction_ids, add_back):
        company_transactions = CompanyWalletTransaction.objects.select_related(
            "company_wallet"
        ).filter(id__in=company_transaction_ids)
        for company_tx in company_transactions:
            company_wallet = company_tx.company_wallet
            if add_back:
                company_wallet.balance += company_tx.amount
            else:
                company_wallet.balance -= company_tx.amount
            company_wallet.save(update_fields=["balance", "updated_at"])
