from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models

from ledgers.models import ResultPeriod
from receipts.models import ReceiptItem
from wallets.models import WalletTransaction


three_digit_validator = RegexValidator(
    regex=r"^\d{3}$",
    message="Number must be exactly 3 digits, example: 000, 024, 124, 999.",
)


class SettlementBatch(models.Model):
    class Status(models.TextChoices):
        PREVIEWED = "previewed", "Previewed"
        FUNDING_REQUIRED = "funding_required", "Funding Required"
        APPROVED = "approved", "Approved"
        PAID = "paid", "Paid"
        VOIDED = "voided", "Voided"

    # ForeignKey (not OneToOne): a period may have at most one non-voided batch,
    # but voided batches are retained for audit, so multiple rows can exist after
    # a void/re-enter (proposal §10.1). Uniqueness of the active batch is enforced
    # in create_settlement_preview.
    result_period = models.ForeignKey(
        ResultPeriod,
        on_delete=models.PROTECT,
        related_name="settlement_batches",
    )

    result_number = models.CharField(max_length=3, validators=[three_digit_validator])

    total_collected = models.DecimalField(max_digits=18, decimal_places=2)
    total_settlement = models.DecimalField(max_digits=18, decimal_places=2)

    company_reserve_required = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    company_reserve_used = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    final_profit_loss = models.DecimalField(max_digits=18, decimal_places=2)

    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PREVIEWED)

    previewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="previewed_settlement_batches",
    )
    previewed_at = models.DateTimeField()

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="approved_settlement_batches",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    paid_at = models.DateTimeField(null=True, blank=True)

    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="voided_settlement_batches",
    )
    voided_at = models.DateTimeField(null=True, blank=True)
    void_reason = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Settlement {self.result_period.code} | {self.result_number} | {self.status}"


class SettlementItem(models.Model):
    class Status(models.TextChoices):
        PREVIEWED = "previewed", "Previewed"
        FUNDING_REQUIRED = "funding_required", "Funding Required"
        APPROVED = "approved", "Approved"
        PAID = "paid", "Paid"
        VOIDED = "voided", "Voided"

    settlement_batch = models.ForeignKey(
        SettlementBatch,
        on_delete=models.PROTECT,
        related_name="items",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="settlement_items",
    )

    number_code = models.CharField(max_length=3, validators=[three_digit_validator])
    total_matched_amount = models.DecimalField(max_digits=18, decimal_places=2)

    settlement_rate = models.DecimalField(max_digits=18, decimal_places=2)
    settlement_amount = models.DecimalField(max_digits=18, decimal_places=2)

    wallet_transaction = models.ForeignKey(
        WalletTransaction,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="settlement_items",
    )

    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PREVIEWED)

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["settlement_batch", "user", "number_code"]),
        ]

    def __str__(self):
        return f"{self.user.name} | {self.number_code} | {self.settlement_amount}"


class SettlementItemSource(models.Model):
    settlement_item = models.ForeignKey(
        SettlementItem,
        on_delete=models.PROTECT,
        related_name="sources",
    )

    receipt_item = models.ForeignKey(
        ReceiptItem,
        on_delete=models.PROTECT,
        related_name="settlement_sources",
    )

    matched_amount = models.DecimalField(max_digits=18, decimal_places=2)

    def __str__(self):
        return f"{self.settlement_item} from {self.receipt_item}"