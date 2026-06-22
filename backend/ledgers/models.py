from decimal import Decimal
from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models


three_digit_validator = RegexValidator(
    regex=r"^\d{3}$",
    message="Number must be exactly 3 digits, example: 000, 024, 124, 999.",
)


class ResultPeriod(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"
        RESULT_ENTERED = "result_entered", "Result Entered"
        SETTLEMENT_PREVIEWED = "settlement_previewed", "Settlement Previewed"
        FUNDING_REQUIRED = "funding_required", "Funding Required"
        READY_TO_APPROVE = "ready_to_approve", "Ready To Approve"
        SETTLEMENT_APPROVED = "settlement_approved", "Settlement Approved"
        SETTLED = "settled", "Settled"
        ARCHIVED = "archived", "Archived"

    class ResultSource(models.TextChoices):
        MANUAL = "manual", "Manual"
        API_IMPORTED = "api_imported", "API Imported"
        API_CHECKED_MANUAL_CONFIRMED = "api_checked_manual_confirmed", "API Checked + Manual Confirmed"

    code = models.CharField(max_length=50, unique=True)  # Example: MAY16
    name = models.CharField(max_length=100)              # Example: May 16 Period

    result_date = models.DateField()
    default_close_time = models.TimeField()

    result_number = models.CharField(
        max_length=3,
        validators=[three_digit_validator],
        null=True,
        blank=True,
    )

    result_source = models.CharField(
        max_length=50,
        choices=ResultSource.choices,
        default=ResultSource.MANUAL,
    )

    is_visible_to_users = models.BooleanField(default=True)

    status = models.CharField(max_length=40, choices=Status.choices, default=Status.OPEN)

    result_entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="entered_results",
    )
    result_entered_at = models.DateTimeField(null=True, blank=True)

    result_voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="voided_results",
    )
    result_voided_at = models.DateTimeField(null=True, blank=True)
    result_void_reason = models.TextField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_result_periods",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} - {self.result_date}"


class Ledger(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"
        SETTLED = "settled", "Settled"
        ARCHIVED = "archived", "Archived"

    result_period = models.ForeignKey(
        ResultPeriod,
        on_delete=models.PROTECT,
        related_name="ledgers",
    )

    name = models.CharField(max_length=100)

    capacity_per_number = models.DecimalField(max_digits=18, decimal_places=2)
    settlement_rate = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("700.00"))

    priority_order = models.PositiveIntegerField()

    open_at = models.DateTimeField()
    close_at = models.DateTimeField()

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    manually_closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="manually_closed_ledgers",
    )
    manually_closed_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_ledgers",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["result_period", "priority_order"]
        indexes = [
            models.Index(fields=["result_period", "priority_order"]),
        ]

    def __str__(self):
        return f"{self.name} | {self.result_period.code} | Priority {self.priority_order}"


class LedgerNumber(models.Model):
    ledger = models.ForeignKey(
        Ledger,
        on_delete=models.PROTECT,
        related_name="numbers",
    )

    number_code = models.CharField(max_length=3, validators=[three_digit_validator])

    max_capacity = models.DecimalField(max_digits=18, decimal_places=2)
    used_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))
    remaining_amount = models.DecimalField(max_digits=18, decimal_places=2)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("ledger", "number_code")
        ordering = ["ledger", "number_code"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(used_amount__gte=0),
                name="ledger_number_used_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(remaining_amount__gte=0),
                name="ledger_number_remaining_non_negative",
            ),
        ]

    def __str__(self):
        return f"{self.ledger.name} - {self.number_code}"


class LedgerPriorityHistory(models.Model):
    ledger = models.ForeignKey(
        Ledger,
        on_delete=models.PROTECT,
        related_name="priority_history",
    )

    old_priority = models.PositiveIntegerField(null=True, blank=True)
    new_priority = models.PositiveIntegerField()

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="changed_ledger_priorities",
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ledger.name}: {self.old_priority} → {self.new_priority}"