from decimal import Decimal

from django.core.management.base import BaseCommand

from accounts.models import User
from wallets.models import UserWallet, WalletTransaction, WithdrawalRequest
from wallets.services import approve_withdrawal_request, mark_withdrawal_paid


class Command(BaseCommand):
    help = "Test withdrawal approval and paid workflow"

    def handle(self, *args, **options):
        user = User.objects.filter(role="owner").first()

        if not user:
            self.stdout.write(self.style.ERROR("No owner user found."))
            return

        wallet, _ = UserWallet.objects.get_or_create(user=user)

        if wallet.balance < Decimal("50000.00"):
            before = wallet.balance
            wallet.balance = Decimal("50000.00")
            wallet.save(update_fields=["balance", "updated_at"])

            WalletTransaction.objects.create(
                wallet=wallet,
                user=user,
                transaction_type=WalletTransaction.TransactionType.ADJUSTMENT,
                amount=wallet.balance - before,
                balance_before=before,
                balance_after=wallet.balance,
                description="Test balance top-up for withdrawal",
                created_by=user,
            )

        withdrawal = WithdrawalRequest.objects.create(
            user=user,
            wallet=wallet,
            amount=Decimal("10000.00"),
            payment_account_name="Test User",
            payment_account_number="TEST-ACC-001",
            payment_method="Test Payment",
            user_note="Test withdrawal request",
        )

        approved = approve_withdrawal_request(
            withdrawal_request=withdrawal,
            staff_user=user,
            staff_note="Approved test withdrawal",
        )

        paid, wallet_tx = mark_withdrawal_paid(
            withdrawal_request=approved,
            staff_user=user,
            staff_note="Marked paid for test",
        )

        self.stdout.write(self.style.SUCCESS("Withdrawal flow completed."))
        self.stdout.write(f"Withdrawal ID: {paid.id}")
        self.stdout.write(f"Status: {paid.status}")
        self.stdout.write(f"Wallet Transaction ID: {wallet_tx.id}")
        self.stdout.write(f"Wallet Balance After: {wallet_tx.balance_after}")