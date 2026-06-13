from decimal import Decimal

from django.core.management.base import BaseCommand

from accounts.models import User
from company.models import CompanyWallet, CompanyWalletTransaction
from settlements.models import SettlementBatch
from settlements.services import approve_settlement


class Command(BaseCommand):
    help = "Test settlement approval"

    def handle(self, *args, **options):
        admin_user = User.objects.filter(role="owner").first()

        if not admin_user:
            self.stdout.write(self.style.ERROR("No owner user found."))
            return

        batch = SettlementBatch.objects.filter(status="funding_required").first()

        if not batch:
            batch = SettlementBatch.objects.filter(status="previewed").first()

        if not batch:
            self.stdout.write(self.style.ERROR("No settlement batch found."))
            return

        company_wallet, _ = CompanyWallet.objects.get_or_create(
            name="Main Company Reserve",
            defaults={"balance": Decimal("0.00")},
        )

        if company_wallet.balance < batch.company_reserve_required:
            before = company_wallet.balance
            company_wallet.balance = batch.company_reserve_required
            company_wallet.save(update_fields=["balance", "updated_at"])

            CompanyWalletTransaction.objects.create(
                company_wallet=company_wallet,
                transaction_type=CompanyWalletTransaction.TransactionType.RESERVE_DEPOSIT,
                amount=company_wallet.balance - before,
                balance_before=before,
                balance_after=company_wallet.balance,
                description="Test reserve top-up for settlement approval",
                created_by=admin_user,
            )

        approved_batch = approve_settlement(batch=batch, admin_user=admin_user)

        self.stdout.write(self.style.SUCCESS("Settlement approved and paid."))
        self.stdout.write(f"Batch ID: {approved_batch.id}")
        self.stdout.write(f"Status: {approved_batch.status}")
        self.stdout.write(f"Reserve Used: {approved_batch.company_reserve_used}")
        self.stdout.write(f"Paid At: {approved_batch.paid_at}")