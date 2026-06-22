from celery import shared_task
from django.core.management import call_command


@shared_task(name="ledgers.close_expired_ledgers")
def close_expired_ledgers_task() -> None:
    """Close ledgers whose scheduled close_at has passed (status upkeep)."""
    call_command("close_expired_ledgers")
