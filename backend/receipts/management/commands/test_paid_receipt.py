from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from ledgers.models import ResultPeriod
from receipts.services import create_paid_receipt
from wallets.models import UserWallet, WalletTransaction


class Command(BaseCommand):
    help = "Test Flowbit paid receipt creation service"

    def handle(self, *args, **options):
        user = User.objects.filter(role="owner").first()

        if not user:
            self.stdout.write(self.style.ERROR("No owner user found."))
            return

        wallet, _ = UserWallet.objects.get_or_create(user=user)

        if wallet.balance < Decimal("100000.00"):
            before = wallet.balance
            wallet.balance = Decimal("100000.00")
            wallet.save(update_fields=["balance", "updated_at"])

            WalletTransaction.objects.create(
                wallet=wallet,
                user=user,
                transaction_type=WalletTransaction.TransactionType.ADJUSTMENT,
                amount=wallet.balance - before,
                balance_before=before,
                balance_after=wallet.balance,
                description="Test balance top-up",
                created_by=user,
            )

        result_period = ResultPeriod.objects.filter(code="JUNE01").first()

        if not result_period:
            result_period = ResultPeriod.objects.filter(code="JUN01").first()

        if not result_period:
            self.stdout.write(self.style.ERROR("No JUNE01 or JUN01 result period found."))
            return

        raw_items = [
            {"number_code": "124", "amount": "3000"},
            {"number_code": "125", "amount": "5000"},
            {"number_code": "112", "amount": "1000", "use_r": True},
        ]

        receipt = create_paid_receipt(
            user=user,
            result_period=result_period,
            raw_items=raw_items,
        )

        self.stdout.write(self.style.SUCCESS("Paid receipt created successfully."))
        self.stdout.write(f"Receipt No: {receipt.receipt_no}")
        self.stdout.write(f"User: {receipt.user.name}")
        self.stdout.write(f"Total Amount: {receipt.total_amount}")
        self.stdout.write(f"Status: {receipt.status}")
        self.stdout.write(f"Paid At: {timezone.localtime(receipt.paid_at)}")