from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from audit.models import AuditLog
from company.models import CompanyWallet, CompanyWalletTransaction
from company.services import add_company_reserve
from ledgers.models import LedgerNumber, ResultPeriod
from ledgers.services import enter_result_and_preview_settlement, get_user_visible_results
from notifications.models import Notification
from receipts.models import PaidNumberAllocation, Receipt, ReceiptItem
from receipts.services import create_paid_receipt
from settlements.models import SettlementBatch, SettlementItem
from settlements.services import approve_settlement
from wallets.models import DepositRequest, UserWallet, WalletTransaction, WithdrawalRequest
from wallets.services import approve_deposit_request


class Command(BaseCommand):
    help = "Run the full local development backend flow against TEST02."

    TEST_PHONE = "+959777777777"
    TEST_PHONE_COUNTRY_CODE = "+95"
    TEST_PHONE_NUMBER = "9777777777"
    TEST_USER_NAME = "Flow Test User"
    TEST_USER_PASSWORD = "testpassword123"
    TEST_PERIOD_CODE = "TEST02"
    DEPOSIT_AMOUNT = Decimal("50000.00")

    def handle(self, *args, **options):
        run_started_at = timezone.now()

        owner_user = User.objects.filter(role=User.Role.OWNER).order_by("id").first()
        if not owner_user:
            self.stdout.write(self.style.ERROR("No owner user found."))
            return

        operator_user = self._get_first_operator_user()
        if not operator_user:
            self.stdout.write(
                self.style.ERROR("No owner/admin/staff user found for deposit approval.")
            )
            return

        call_command("create_test_period")

        test_user = self._ensure_test_user()
        wallet = self._reset_test_user_state(test_user)

        deposit = DepositRequest.objects.create(
            user=test_user,
            wallet=wallet,
            amount=self.DEPOSIT_AMOUNT,
            payment_method="Test Payment",
            sender_account_name=self.TEST_USER_NAME,
            transaction_reference=f"{self.TEST_PERIOD_CODE}-DEP-001",
            user_note="Full flow test deposit request",
        )

        deposit, _wallet_tx = approve_deposit_request(
            deposit_request=deposit,
            staff_user=operator_user,
            staff_note="Approved by test_full_flow",
        )

        wallet.refresh_from_db()
        self._assert_equal(
            wallet.balance,
            self.DEPOSIT_AMOUNT,
            "Wallet balance did not increase after deposit approval.",
        )

        result_period = ResultPeriod.objects.get(code=self.TEST_PERIOD_CODE)

        receipt = create_paid_receipt(
            user=test_user,
            result_period=result_period,
            raw_items=[
                {"number_code": "124", "amount": "3000"},
                {"number_code": "112", "amount": "1000", "use_r": True},
            ],
        )

        receipt_items_count = ReceiptItem.objects.filter(receipt=receipt).count()
        allocations_count = PaidNumberAllocation.objects.filter(
            receipt_item__receipt=receipt
        ).count()
        self._assert_true(receipt_items_count == 4, "Expected 4 receipt items.")
        self._assert_true(allocations_count == 4, "Expected 4 paid allocations.")

        ledger_amount_expectations = {
            "124": Decimal("3000.00"),
            "112": Decimal("1000.00"),
            "121": Decimal("1000.00"),
            "211": Decimal("1000.00"),
        }
        for number_code, expected_used in ledger_amount_expectations.items():
            ledger_number = LedgerNumber.objects.get(
                ledger__result_period=result_period,
                number_code=number_code,
            )
            self._assert_equal(
                ledger_number.used_amount,
                expected_used,
                f"Ledger number {number_code} used_amount mismatch.",
            )

        batch = enter_result_and_preview_settlement(
            result_period=result_period,
            result_number="124",
            admin_user=owner_user,
        )

        reserve_top_up_tx = None
        company_wallet = CompanyWallet.objects.order_by("id").first()
        if not company_wallet:
            company_wallet = CompanyWallet.objects.create(
                name="Main Company Reserve",
                balance=Decimal("0.00"),
            )

        if company_wallet.balance < batch.company_reserve_required:
            reserve_amount = batch.company_reserve_required - company_wallet.balance
            company_wallet, reserve_top_up_tx = add_company_reserve(
                wallet=company_wallet,
                amount=reserve_amount,
                admin_user=owner_user,
                description=f"Test reserve top-up for {self.TEST_PERIOD_CODE}",
            )

        approved_batch = approve_settlement(batch=batch, admin_user=owner_user)
        settlement_item = SettlementItem.objects.get(
            settlement_batch=approved_batch,
            user=test_user,
        )

        wallet.refresh_from_db()
        result_period.refresh_from_db()

        self._assert_equal(
            approved_batch.status,
            SettlementBatch.Status.PAID,
            "Settlement batch is not paid.",
        )
        self._assert_equal(
            settlement_item.status,
            SettlementItem.Status.PAID,
            "Settlement item is not paid.",
        )
        self._assert_true(
            wallet.balance > self.DEPOSIT_AMOUNT - receipt.total_amount,
            "User wallet was not credited by settlement.",
        )
        self._assert_true(
            approved_batch.company_reserve_used >= Decimal("0.00"),
            "Company reserve used is invalid.",
        )

        visible_results = get_user_visible_results(test_user)
        matching_result = next(
            (
                result for result in visible_results
                if str(result["result_number"]) == approved_batch.result_number
            ),
            None,
        )
        self._assert_true(matching_result is not None, "Past result service did not return TEST02.")

        notifications_count = Notification.objects.filter(
            user=test_user,
            created_at__gte=run_started_at,
        ).count()
        self._assert_true(
            notifications_count >= 2,
            "Expected at least deposit and settlement notifications.",
        )

        audit_log_filters = [
            ("deposit_requests", deposit.id),
            ("result_periods", result_period.id),
            ("settlement_batches", approved_batch.id),
        ]
        if reserve_top_up_tx:
            audit_log_filters.append(("company_wallet_transactions", reserve_top_up_tx.id))

        audit_log_count = AuditLog.objects.filter(
            created_at__gte=run_started_at,
        ).filter(
            self._build_audit_q(audit_log_filters)
        ).count()
        self._assert_true(audit_log_count >= 5, "Expected audit logs for the full flow.")

        self.stdout.write(self.style.SUCCESS("Full backend flow test completed successfully."))
        self.stdout.write(f"User: {test_user.name} ({test_user.phone})")
        self.stdout.write(f"Deposit: {deposit.amount} | {deposit.status}")
        self.stdout.write(f"Receipt: {receipt.receipt_no} | total {receipt.total_amount}")
        self.stdout.write(
            f"Settlement: {settlement_item.settlement_amount} | batch {approved_batch.status}"
        )
        self.stdout.write(f"Final Wallet Balance: {wallet.balance}")
        self.stdout.write(f"Notifications Count: {notifications_count}")
        self.stdout.write(f"Audit Log Count: {audit_log_count}")

    def _ensure_test_user(self):
        user, _created = User.objects.get_or_create(
            phone=self.TEST_PHONE,
            defaults={
                "name": self.TEST_USER_NAME,
                "phone_country_code": self.TEST_PHONE_COUNTRY_CODE,
                "phone_number": self.TEST_PHONE_NUMBER,
                "role": User.Role.USER,
                "status": User.Status.ACTIVE,
            },
        )

        user.name = self.TEST_USER_NAME
        user.phone_country_code = self.TEST_PHONE_COUNTRY_CODE
        user.phone_number = self.TEST_PHONE_NUMBER
        user.role = User.Role.USER
        user.status = User.Status.ACTIVE
        user.set_password(self.TEST_USER_PASSWORD)
        user.save()
        return user

    @transaction.atomic
    def _reset_test_user_state(self, test_user):
        wallet, _ = UserWallet.objects.select_for_update().get_or_create(user=test_user)

        Notification.objects.filter(user=test_user).delete()
        DepositRequest.objects.filter(user=test_user).delete()
        WithdrawalRequest.objects.filter(user=test_user).delete()
        WalletTransaction.objects.filter(user=test_user).delete()

        wallet.balance = Decimal("0.00")
        wallet.locked_balance = Decimal("0.00")
        wallet.save(update_fields=["balance", "locked_balance", "updated_at"])
        return wallet

    def _get_first_operator_user(self):
        for role in (User.Role.OWNER, User.Role.ADMIN, User.Role.STAFF):
            user = User.objects.filter(role=role).order_by("id").first()
            if user:
                return user
        return None

    def _build_audit_q(self, filters):
        from django.db.models import Q

        query = Q()
        for target_table, target_id in filters:
            query |= Q(target_table=target_table, target_id=target_id)
        return query

    def _assert_equal(self, actual, expected, message):
        if actual != expected:
            raise ValueError(f"{message} Expected {expected}, got {actual}.")

    def _assert_true(self, condition, message):
        if not condition:
            raise ValueError(message)
