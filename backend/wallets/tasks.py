from celery import shared_task
from django.core.management import call_command


@shared_task(name="wallets.reconcile_finances")
def reconcile_finances_task() -> None:
    """Verify financial invariants; raises (task fails -> alarms) on drift."""
    call_command("reconcile_finances")


@shared_task(name="wallets.purge_idempotency_keys")
def purge_idempotency_keys_task() -> None:
    """Delete expired idempotency keys."""
    call_command("purge_idempotency_keys")
