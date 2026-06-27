from decimal import Decimal
from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models

from ledgers.models import ResultPeriod, Ledger, LedgerNumber


# Exactly 3 digits (3D); the exact length is also enforced in the services.
three_digit_validator = RegexValidator(
    regex=r"^\d{3}$",
    message="Number must be exactly 3 digits, example: 124.",
)


class Receipt(models.Model):
    class Status(models.TextChoices):
        PAID = "paid", "Paid"
        VOIDED = "voided", "Voided"

    receipt_no = models.CharField(max_length=100, unique=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="receipts",
    )

    result_period = models.ForeignKey(
        ResultPeriod,
        on_delete=models.PROTECT,
        related_name="receipts",
    )

    total_amount = models.DecimalField(max_digits=18, decimal_places=2)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PAID)

    paid_at = models.DateTimeField()

    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="voided_receipts",
    )
    voided_at = models.DateTimeField(null=True, blank=True)
    void_reason = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.receipt_no


class ReceiptItem(models.Model):
    receipt = models.ForeignKey(
        Receipt,
        on_delete=models.PROTECT,
        related_name="items",
    )

    number_code = models.CharField(max_length=3, validators=[three_digit_validator])
    amount = models.DecimalField(max_digits=18, decimal_places=2)

    is_generated_by_r = models.BooleanField(default=False)
    source_input = models.CharField(max_length=20, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.receipt.receipt_no} | {self.number_code} : {self.amount}"


class PaidNumberAllocation(models.Model):
    receipt_item = models.ForeignKey(
        ReceiptItem,
        on_delete=models.PROTECT,
        related_name="allocations",
    )

    ledger = models.ForeignKey(
        Ledger,
        on_delete=models.PROTECT,
        related_name="paid_allocations",
    )

    ledger_number = models.ForeignKey(
        LedgerNumber,
        on_delete=models.PROTECT,
        related_name="paid_allocations",
    )

    number_code = models.CharField(max_length=3, validators=[three_digit_validator])
    allocated_amount = models.DecimalField(max_digits=18, decimal_places=2)

    allocation_order = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ledger.name} | {self.number_code} | {self.allocated_amount}"


class RGeneratedGroup(models.Model):
    receipt = models.ForeignKey(
        Receipt,
        on_delete=models.PROTECT,
        related_name="r_generated_groups",
    )

    source_number = models.CharField(max_length=3, validators=[three_digit_validator])
    source_text = models.CharField(max_length=20)

    amount_per_number = models.DecimalField(max_digits=18, decimal_places=2)
    generated_count = models.PositiveIntegerField()
    total_amount = models.DecimalField(max_digits=18, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.source_text} | {self.generated_count} numbers"


class RGeneratedItem(models.Model):
    group = models.ForeignKey(
        RGeneratedGroup,
        on_delete=models.PROTECT,
        related_name="items",
    )

    receipt_item = models.ForeignKey(
        ReceiptItem,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="r_generated_items",
    )

    number_code = models.CharField(max_length=3, validators=[three_digit_validator])
    amount = models.DecimalField(max_digits=18, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.group.source_text} → {self.number_code}"