from django.core.management.base import BaseCommand

from audit.services import verify_audit_chain


class Command(BaseCommand):
    help = (
        "Verify the tamper-evident audit hash chain. Exits non-zero if any "
        "entry has been modified or deleted (suitable for a monitored cron)."
    )

    def handle(self, *args, **options):
        result = verify_audit_chain()

        if result["ok"]:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Audit chain OK — {result['count']} entr(ies) verified."
                )
            )
            return

        broken = ", ".join(str(i) for i in result["broken_ids"])
        self.stderr.write(
            self.style.ERROR(
                f"Audit chain BROKEN — {len(result['broken_ids'])} of "
                f"{result['count']} entr(ies) failed: {broken}"
            )
        )
        # Non-zero exit so a scheduler/monitor can alarm on tampering.
        raise SystemExit(1)
