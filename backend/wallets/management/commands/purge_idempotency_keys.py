from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from wallets.models import IdempotencyKey


class Command(BaseCommand):
    help = "Delete idempotency keys older than --days (default 7). Run on a schedule."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options["days"])
        deleted, _ = IdempotencyKey.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} idempotency key(s)."))
