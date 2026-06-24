from django.core.management.base import BaseCommand

from ledgers.services import ensure_scheduled_periods


class Command(BaseCommand):
    help = (
        "Auto-open upcoming result periods (with ledgers) per the period "
        "schedule config. Idempotent — safe to run on a schedule (e.g. daily)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report which periods would be created without writing them.",
        )

    def handle(self, *args, **options):
        summary = ensure_scheduled_periods(dry_run=options["dry_run"])

        if not summary["enabled"]:
            self.stdout.write(summary["reason"])
            return
        if summary["reason"]:
            self.stdout.write(self.style.WARNING(summary["reason"]))
            return

        created = summary["created"]
        verb = "Would create" if options["dry_run"] else "Created"
        if created:
            self.stdout.write(self.style.SUCCESS(f"{verb} period(s): {', '.join(created)}"))
        else:
            self.stdout.write("No new periods needed; schedule is up to date.")
