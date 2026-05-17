from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Ledger, LedgerNumber


@receiver(post_save, sender=Ledger)
def create_ledger_numbers(sender, instance, created, **kwargs):
    if not created:
        return

    ledger_numbers = []

    for i in range(1000):
        number_code = f"{i:03d}"

        ledger_numbers.append(
            LedgerNumber(
                ledger=instance,
                number_code=number_code,
                max_capacity=instance.capacity_per_number,
                used_amount=Decimal("0.00"),
                remaining_amount=instance.capacity_per_number,
            )
        )

    LedgerNumber.objects.bulk_create(ledger_numbers)