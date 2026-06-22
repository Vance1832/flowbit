from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Sum

from company.models import CompanyWallet, CompanyWalletTransaction
from ledgers.models import LedgerNumber
from receipts.models import PaidNumberAllocation
from wallets.models import UserWallet, WithdrawalRequest

ZERO = Decimal("0.00")


class Command(BaseCommand):
    help = (
        "Verify financial invariants and report drift. Exits non-zero on any "
        "discrepancy so it can alarm from cron/monitoring. Read-only."
    )

    def handle(self, *args, **options):
        problems: list[str] = []

        # 1. A wallet's locked balance must equal its approved-but-unpaid
        #    withdrawals (approval moves balance -> locked; payment releases it).
        approved = (
            WithdrawalRequest.objects.filter(status=WithdrawalRequest.Status.APPROVED)
            .values("wallet")
            .annotate(total=Sum("amount"))
        )
        locked_expected = {row["wallet"]: row["total"] for row in approved}
        for wallet in UserWallet.objects.all():
            expected = locked_expected.get(wallet.id, ZERO)
            if wallet.locked_balance != expected:
                problems.append(
                    f"wallet {wallet.id}: locked_balance={wallet.locked_balance} "
                    f"but approved-unpaid withdrawals total {expected}"
                )

        # 2. Ledger numbers: used + remaining == capacity, and used == the sum of
        #    its paid allocations.
        alloc = (
            PaidNumberAllocation.objects.values("ledger_number")
            .annotate(total=Sum("allocated_amount"))
        )
        used_expected = {row["ledger_number"]: row["total"] for row in alloc}
        for ln in LedgerNumber.objects.all().iterator():
            if ln.used_amount + ln.remaining_amount != ln.max_capacity:
                problems.append(
                    f"ledger_number {ln.id}: used+remaining="
                    f"{ln.used_amount + ln.remaining_amount} != capacity {ln.max_capacity}"
                )
            expected = used_expected.get(ln.id, ZERO)
            if ln.used_amount != expected:
                problems.append(
                    f"ledger_number {ln.id}: used_amount={ln.used_amount} "
                    f"!= allocations total {expected}"
                )

        # 3. Company wallet balance must match its latest transaction's balance_after.
        for cw in CompanyWallet.objects.all():
            latest = (
                CompanyWalletTransaction.objects.filter(company_wallet=cw)
                .order_by("-created_at", "-id")
                .first()
            )
            if latest is None:
                if cw.balance != ZERO:
                    problems.append(f"company_wallet {cw.id}: balance={cw.balance} with no transactions")
            elif latest.balance_after != cw.balance:
                problems.append(
                    f"company_wallet {cw.id}: balance={cw.balance} "
                    f"!= latest transaction balance_after {latest.balance_after}"
                )

        if problems:
            for problem in problems:
                self.stderr.write(self.style.ERROR(f"[discrepancy] {problem}"))
            raise CommandError(f"Reconciliation found {len(problems)} discrepancy(ies).")

        self.stdout.write(self.style.SUCCESS("Reconciliation passed: no discrepancies."))
