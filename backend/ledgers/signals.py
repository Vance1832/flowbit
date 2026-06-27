from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Ledger, LedgerNumber


@receiver(post_save, sender=Ledger)
def create_ledger_numbers(sender, instance, created, **kwargs):
    if not created:
        return

    # 3D periods cover 000–999 (1000 numbers).
    length = instance.result_period.number_length
    count = 10 ** length

    ledger_numbers = [
        LedgerNumber(
            ledger=instance,
            number_code=f"{i:0{length}d}",
            max_capacity=instance.capacity_per_number,
            used_amount=Decimal("0.00"),
            remaining_amount=instance.capacity_per_number,
        )
        for i in range(count)
    ]

    LedgerNumber.objects.bulk_create(ledger_numbers)