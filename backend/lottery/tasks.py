from celery import shared_task
from django.core.management import call_command


@shared_task(name="lottery.fetch_latest")
def fetch_lotto_latest_task() -> None:
    """Fetch the latest official draw (GLO) and cross-check it against the archive."""
    call_command("fetch_lotto_latest")
