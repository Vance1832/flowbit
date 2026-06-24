from collections import OrderedDict

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from audit.models import AuditLog
from company.models import CompanyCashoutRequest, CompanyWallet, CompanyWalletTransaction
from ledgers.models import Ledger, LedgerNumber, LedgerPriorityHistory, ResultPeriod
from notifications.models import Notification
from receipts.models import (
    PaidNumberAllocation,
    RGeneratedGroup,
    RGeneratedItem,
    Receipt,
    ReceiptItem,
)
from settlements.models import SettlementBatch, SettlementItem, SettlementItemSource
from wallets.models import DepositRequest, UserWallet, WalletTransaction, WithdrawalRequest


User = get_user_model()


class Command(BaseCommand):
    help = "Dry-run or reset local development data while keeping the owner account."

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Actually perform the reset. Without this flag the command only prints a dry-run summary.",
        )

    def handle(self, *args, **options):
        confirm = options["confirm"]
        plan = self._build_plan()

        self.stdout.write(self.style.WARNING(
            f"{'RESET' if confirm else 'DRY RUN'}: reset_production_seed"
        ))
        self.stdout.write(f"Owner accounts kept: {', '.join(plan['owner_phones']) or 'none'}")
        self.stdout.write(f"Non-owner users matched for removal: {plan['summary']['User']}")
        self.stdout.write("")
        self.stdout.write("Reset summary:")
        for label, count in plan["summary"].items():
            self.stdout.write(f"- {label}: {count}")

        if not confirm:
            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS(
                    "Dry run complete. Re-run with --confirm to apply the cleanup."
                )
            )
            return

        with transaction.atomic():
            self._execute_reset(plan)

        remaining_users = User.objects.order_by("id").values_list("phone", flat=True)
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Production seed reset completed successfully."))
        self.stdout.write(f"Remaining users: {', '.join(remaining_users)}")

    def _build_plan(self):
        owners = User.objects.filter(role=User.Role.OWNER).order_by("id")
        non_owner_users = User.objects.exclude(role=User.Role.OWNER).order_by("id")

        summary = OrderedDict(
            [
                ("AuditLog", AuditLog.objects.count()),
                ("Notification", Notification.objects.count()),
                ("SettlementItemSource", SettlementItemSource.objects.count()),
                ("SettlementItem", SettlementItem.objects.count()),
                ("SettlementBatch", SettlementBatch.objects.count()),
                ("PaidNumberAllocation", PaidNumberAllocation.objects.count()),
                ("RGeneratedItem", RGeneratedItem.objects.count()),
                ("RGeneratedGroup", RGeneratedGroup.objects.count()),
                ("ReceiptItem", ReceiptItem.objects.count()),
                ("Receipt", Receipt.objects.count()),
                ("LedgerPriorityHistory", LedgerPriorityHistory.objects.count()),
                ("LedgerNumber", LedgerNumber.objects.count()),
                ("Ledger", Ledger.objects.count()),
                ("ResultPeriod", ResultPeriod.objects.count()),
                ("DepositRequest", DepositRequest.objects.count()),
                ("WithdrawalRequest", WithdrawalRequest.objects.count()),
                ("WalletTransaction", WalletTransaction.objects.count()),
                ("CompanyCashoutRequest", CompanyCashoutRequest.objects.count()),
                ("CompanyWalletTransaction", CompanyWalletTransaction.objects.count()),
                ("UserWallet", UserWallet.objects.count()),
                ("User", non_owner_users.count()),
            ]
        )

        return {
            "owner_ids": list(owners.values_list("id", flat=True)),
            "owner_phones": list(owners.values_list("phone", flat=True)),
            "non_owner_user_ids": list(non_owner_users.values_list("id", flat=True)),
            "summary": summary,
        }

    def _execute_reset(self, plan):
        AuditLog.unsafe_objects.all().delete()  # append-only escape hatch
        Notification.objects.all().delete()
        SettlementItemSource.objects.all().delete()
        SettlementItem.objects.all().delete()
        SettlementBatch.objects.all().delete()
        PaidNumberAllocation.objects.all().delete()
        RGeneratedItem.objects.all().delete()
        RGeneratedGroup.objects.all().delete()
        ReceiptItem.objects.all().delete()
        Receipt.objects.all().delete()
        LedgerPriorityHistory.objects.all().delete()
        LedgerNumber.objects.all().delete()
        Ledger.objects.all().delete()
        ResultPeriod.objects.all().delete()
        DepositRequest.objects.all().delete()
        WithdrawalRequest.objects.all().delete()
        WalletTransaction.objects.all().delete()
        CompanyCashoutRequest.objects.all().delete()
        CompanyWalletTransaction.objects.all().delete()

        UserWallet.objects.exclude(user_id__in=plan["owner_ids"]).delete()
        User.objects.filter(id__in=plan["non_owner_user_ids"]).delete()

        owner_wallets = UserWallet.objects.filter(user_id__in=plan["owner_ids"])
        for wallet in owner_wallets:
            wallet.balance = 0
            wallet.locked_balance = 0
            wallet.save(update_fields=["balance", "locked_balance", "updated_at"])

        if plan["owner_ids"]:
            for owner_id in plan["owner_ids"]:
                UserWallet.objects.get_or_create(user_id=owner_id)

        for company_wallet in CompanyWallet.objects.all():
            company_wallet.balance = 0
            company_wallet.save(update_fields=["balance", "updated_at"])

        if not CompanyWallet.objects.exists():
            CompanyWallet.objects.create(name="Main Company Reserve", balance=0)
