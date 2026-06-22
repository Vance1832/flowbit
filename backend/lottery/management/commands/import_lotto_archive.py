from django.core.management.base import BaseCommand

from lottery.models import LotteryDraw
from lottery.sources import download_archive_tarball, iter_archive_draws


class Command(BaseCommand):
    help = (
        "Backfill historical Thai lottery draws (since 2007) from the "
        "vicha-w/thai-lotto-archive repository. Idempotent: re-running updates "
        "existing draws and adds new ones. Read-only reference data — does not "
        "touch result periods, betting, or settlement."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report without writing to the database.",
        )
        parser.add_argument(
            "--since",
            type=int,
            default=None,
            metavar="YEAR",
            help="Only import draws on or after this year (e.g. 2015).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        since = options["since"]

        self.stdout.write("Downloading archive tarball…")
        tarball = download_archive_tarball()

        created = updated = skipped = failed = 0

        for record, error in iter_archive_draws(tarball):
            if error is not None:
                draw_date, message = error
                failed += 1
                self.stderr.write(self.style.WARNING(f"Skip {draw_date}: {message}"))
                continue

            if since and record["draw_date"].year < since:
                skipped += 1
                continue

            if dry_run:
                created += 1  # counts as "would import"
                continue

            _, was_created = LotteryDraw.objects.update_or_create(
                draw_date=record["draw_date"],
                defaults={
                    "first_prize": record["first_prize"],
                    "three_up": record["three_up"],
                    "two_down": record["two_down"],
                    "raw": record["raw"],
                    "source": LotteryDraw.Source.ARCHIVE,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"[dry-run] would import {created} draw(s); "
                    f"{failed} unparseable, {skipped} before --since."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Imported: {created} new, {updated} updated, "
                    f"{skipped} skipped, {failed} unparseable."
                )
            )
