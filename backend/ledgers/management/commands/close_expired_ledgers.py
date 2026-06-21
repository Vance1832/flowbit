from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from audit.models import AuditLog
from audit.services import create_audit_log
from ledgers.models import Ledger


class Command(BaseCommand):
    help = (
        "Close ledgers whose scheduled close_at has passed. Submission already "
        "refuses bets outside the window; this keeps the stored status accurate. "
        "Intended to run on a schedule (e.g. cron, every minute)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be closed without writing any changes.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        now = timezone.now()

        expired = Ledger.objects.filter(
            status=Ledger.Status.OPEN,
            close_at__lte=now,
        ).order_by("id")

        count = 0
        for ledger in expired:
            if dry_run:
                self.stdout.write(
                    f"[dry-run] would close ledger #{ledger.id} "
                    f"({ledger.name}) — close_at {ledger.close_at.isoformat()}"
                )
                count += 1
                continue

            with transaction.atomic():
                locked = (
                    Ledger.objects.select_for_update().get(id=ledger.id)
                )
                # Re-check under lock: it may have been closed since the scan.
                if locked.status != Ledger.Status.OPEN or locked.close_at > now:
                    continue

                locked.status = Ledger.Status.CLOSED
                locked.save(update_fields=["status", "updated_at"])

                # actor_user=None — logged as an automated/system action.
                create_audit_log(
                    actor_user=None,
                    action=AuditLog.ActionType.CLOSE,
                    target_table="ledgers",
                    target_id=locked.id,
                    old_values={"status": Ledger.Status.OPEN},
                    new_values={"status": Ledger.Status.CLOSED},
                    reason="Auto-closed: scheduled close time passed.",
                )

            count += 1
            self.stdout.write(
                self.style.SUCCESS(f"Closed ledger #{ledger.id} ({ledger.name}).")
            )

        verb = "Would close" if dry_run else "Closed"
        self.stdout.write(self.style.SUCCESS(f"{verb} {count} expired ledger(s)."))
