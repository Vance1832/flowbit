from decimal import Decimal
from django.conf import settings
from django.db import models


class UserWallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="wallet",
    )
    balance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))
    locked_balance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(balance__gte=0),
                name="wallet_balance_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(locked_balance__gte=0),
                name="wallet_locked_balance_non_negative",
            ),
        ]

    def __str__(self):
        return f"Wallet - {self.user.name} | Balance: {self.balance}"


class WalletTransaction(models.Model):
    class TransactionType(models.TextChoices):
        DEPOSIT = "deposit", "Deposit"
        WITHDRAWAL = "withdrawal", "Withdrawal"
        NUMBER_PAYMENT = "number_payment", "Number Payment"
        SETTLEMENT_CREDIT = "settlement_credit", "Settlement Credit"
        REFUND = "refund", "Refund"
        ADJUSTMENT = "adjustment", "Adjustment"

    wallet = models.ForeignKey(
        UserWallet,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="wallet_transactions",
    )

    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=18, decimal_places=2)

    balance_before = models.DecimalField(max_digits=18, decimal_places=2)
    balance_after = models.DecimalField(max_digits=18, decimal_places=2)

    reference_table = models.CharField(max_length=100, null=True, blank=True)
    reference_id = models.PositiveBigIntegerField(null=True, blank=True)

    description = models.TextField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="created_wallet_transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} | {self.user.name} | {self.amount}"


class DepositRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_REVIEW = "in_review", "In Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="deposit_requests",
    )
    wallet = models.ForeignKey(
        UserWallet,
        on_delete=models.PROTECT,
        related_name="deposit_requests",
    )

    amount = models.DecimalField(max_digits=18, decimal_places=2)
    payment_method = models.CharField(max_length=100, null=True, blank=True)
    sender_account_name = models.CharField(max_length=150, null=True, blank=True)
    transaction_reference = models.CharField(max_length=150, null=True, blank=True)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="assigned_deposit_requests",
    )
    assigned_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    proof_image_url = models.URLField(max_length=500, null=True, blank=True)
    user_note = models.TextField(null=True, blank=True)
    staff_note = models.TextField(null=True, blank=True)

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reviewed_deposits",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Deposit {self.amount} | {self.user.name} | {self.status}"


class WithdrawalRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PAID = "paid", "Paid"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="withdrawal_requests",
    )
    wallet = models.ForeignKey(
        UserWallet,
        on_delete=models.PROTECT,
        related_name="withdrawal_requests",
    )

    amount = models.DecimalField(max_digits=18, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    payment_account_name = models.CharField(max_length=150, null=True, blank=True)
    payment_account_number = models.CharField(max_length=100, null=True, blank=True)
    payment_method = models.CharField(max_length=100, null=True, blank=True)

    user_note = models.TextField(null=True, blank=True)
    staff_note = models.TextField(null=True, blank=True)

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reviewed_withdrawals",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="paid_withdrawals",
    )
    paid_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Withdrawal {self.amount} | {self.user.name} | {self.status}"


class SystemSetting(models.Model):
    setting_key = models.CharField(max_length=100, unique=True)
    setting_value = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="updated_system_settings",
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.setting_key} = {self.setting_value}"

class IdempotencyKey(models.Model):
    """Caches the result of a money-mutating request keyed by a client-supplied
    Idempotency-Key, so retries/double-submits don't create duplicates."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="idempotency_keys",
    )
    key = models.CharField(max_length=255)

    # status_code == 0 means "claimed, still processing"; a real code means done.
    status_code = models.PositiveSmallIntegerField(default=0)
    response_body = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "key")
        indexes = [models.Index(fields=["created_at"])]

    def __str__(self):
        return f"Idempotency {self.user_id}:{self.key} ({self.status_code})"
