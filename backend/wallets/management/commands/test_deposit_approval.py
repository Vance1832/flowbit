from decimal import Decimal

from django.core.management.base import BaseCommand

from accounts.models import User
from wallets.models import DepositRequest, UserWallet
from wallets.services import approve_deposit_request


class Command(BaseCommand):
    help = "Test deposit approval workflow"

    def handle(self, *args, **options):
        user = User.objects.filter(role="owner").first()

        if not user:
            self.stdout.write(self.style.ERROR("No owner user found."))
            return

        wallet, _ = UserWallet.objects.get_or_create(user=user)

        deposit = DepositRequest.objects.create(
            user=user,
            wallet=wallet,
            amount=Decimal("50000.00"),
            payment_method="Test Payment",
            sender_account_name="Test Sender",
            transaction_reference="TEST-DEP-001",
            user_note="Test deposit request",
        )

        approved_deposit, wallet_tx = approve_deposit_request(
            deposit_request=deposit,
            staff_user=user,
            staff_note="Approved test deposit",
        )

        self.stdout.write(self.style.SUCCESS("Deposit approved successfully."))
        self.stdout.write(f"Deposit ID: {approved_deposit.id}")
        self.stdout.write(f"Status: {approved_deposit.status}")
        self.stdout.write(f"Wallet Transaction ID: {wallet_tx.id}")
        self.stdout.write(f"New Balance: {wallet_tx.balance_after}")