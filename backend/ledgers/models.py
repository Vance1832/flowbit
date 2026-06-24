from decimal import Decimal
from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models


# A bet number is 2 or 3 digits depending on the period's bet_type; exact length
# is enforced per-period in the services. The model-level validator just keeps
# stored codes numeric and the right rough shape.
number_code_validator = RegexValidator(
    regex=r"^\d{2,3}$",
    message="Number must be 2 or 3 digits, example: 24, 124.",
)

# Back-compat alias (was 3D-only); still used where a code is known to be 3D.
three_digit_validator = number_code_validator


class ResultPeriod(models.Model):
    class BetType(models.TextChoices):
        THREE_D = "3d", "3D"
        TWO_D = "2d", "2D"

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

    # Whether this period takes 3-digit (3D) or 2-digit (2D) bets. Drives the
    # ledger-number seeding count and the accepted number length end-to-end.
    bet_type = models.CharField(
        max_length=2,
        choices=BetType.choices,
        default=BetType.THREE_D,
    )

    result_date = models.DateField()
    default_close_time = models.TimeField()

    result_number = models.CharField(
        max_length=3,
        validators=[number_code_validator],
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

    @property
    def number_length(self) -> int:
        """Digits in a bet number for this period: 2 for 2D, 3 for 3D."""
        return 2 if self.bet_type == self.BetType.TWO_D else 3

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

    number_code = models.CharField(max_length=3, validators=[number_code_validator])

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

class LedgerTemplate(models.Model):
    """A reusable set of ledger tiers, applied to a result period in one step."""

    name = models.CharField(max_length=100, unique=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_ledger_templates",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class PeriodSchedule(models.Model):
    """Singleton config that auto-opens upcoming result periods.

    When enabled, a scheduled job ensures an open ``ResultPeriod`` (with ledgers
    built from ``template``) exists for each active weekday within the horizon,
    so staff no longer have to create the next period by hand every day.
    """

    is_enabled = models.BooleanField(default=False)

    template = models.ForeignKey(
        LedgerTemplate,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="schedules",
    )
    # The daily betting close time applied to each auto-created period.
    default_close_time = models.TimeField(null=True, blank=True)

    # How many days ahead (beyond today) to pre-create periods for. 1 => keep
    # today and tomorrow ready.
    days_ahead = models.PositiveSmallIntegerField(default=1)

    # Comma-separated Python weekday numbers (Mon=0 … Sun=6) on which periods
    # are created. Default: every day.
    active_weekdays = models.CharField(max_length=20, default="0,1,2,3,4,5,6")

    # Optional prefix for generated period codes (code = prefix + YYMMDD).
    code_prefix = models.CharField(max_length=20, blank=True, default="")

    last_run_at = models.DateTimeField(null=True, blank=True)

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="updated_period_schedules",
    )
    updated_at = models.DateTimeField(auto_now=True)

    def active_weekday_set(self) -> set[int]:
        result = set()
        for part in (self.active_weekdays or "").split(","):
            part = part.strip()
            if part.isdigit() and 0 <= int(part) <= 6:
                result.add(int(part))
        return result

    def __str__(self):
        return f"PeriodSchedule (enabled={self.is_enabled})"


class LedgerTemplateTier(models.Model):
    template = models.ForeignKey(
        LedgerTemplate,
        on_delete=models.CASCADE,
        related_name="tiers",
    )
    name = models.CharField(max_length=100)
    capacity_per_number = models.DecimalField(max_digits=18, decimal_places=2)
    settlement_rate = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("700.00"))
    priority_order = models.PositiveIntegerField()

    class Meta:
        ordering = ["priority_order", "id"]

    def __str__(self):
        return f"{self.template.name} · {self.name} (priority {self.priority_order})"
