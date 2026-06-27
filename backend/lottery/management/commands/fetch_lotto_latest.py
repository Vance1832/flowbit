from django.core.management.base import BaseCommand

from lottery.models import LotteryDraw
from lottery.sources import (
    cross_check_three_up,
    fetch_archive_draw,
    fetch_glo_latest,
)


class Command(BaseCommand):
    help = (
        "Fetch the latest official Thai lottery draw from GLO and store it as a "
        "LotteryDraw, cross-checked against the historical archive. Reference "
        "data only — it never settles anything. Schedule it the evening of the "
        "1st and 16th (e.g. cron), after results are announced."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Fetch and report without writing to the database.",
        )
        parser.add_argument(
            "--no-cross-check",
            action="store_true",
            help="Skip the independent archive cross-check.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        self.stdout.write("Fetching latest draw from GLO…")
        record = fetch_glo_latest()

        cross_check_ok = None
        if not options["no_cross_check"]:
            secondary = fetch_archive_draw(record["draw_date"])
            cross_check_ok = cross_check_three_up(record, secondary)

        line = (
            f"{record['draw_date']} — 3D {record['three_up']} "
            f"(first {record['first_prize']})"
        )

        if cross_check_ok is True:
            self.stdout.write(self.style.SUCCESS(f"{line} — archive agrees ✓"))
        elif cross_check_ok is False:
            self.stderr.write(
                self.style.ERROR(
                    f"{line} — MISMATCH against archive; do not confirm settlement "
                    "until resolved."
                )
            )
        else:
            self.stdout.write(f"{line} — archive not yet available (uncross-checked)")

        if dry_run:
            self.stdout.write(self.style.SUCCESS("[dry-run] nothing written."))
            return

        _, created = LotteryDraw.objects.update_or_create(
            draw_date=record["draw_date"],
            defaults={
                "first_prize": record["first_prize"],
                "three_up": record["three_up"],
                "raw": record["raw"],
                "source": LotteryDraw.Source.GLO,
                "cross_check_ok": cross_check_ok,
            },
        )
        self.stdout.write(
            self.style.SUCCESS(f"{'Created' if created else 'Updated'} draw {record['draw_date']}.")
        )
