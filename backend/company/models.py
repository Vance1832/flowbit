from decimal import Decimal
from django.conf import settings
from django.db import models


class CompanyWallet(models.Model):
    name = models.CharField(max_length=100)
    balance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(balance__gte=0),
                name="company_wallet_balance_non_negative",
            ),
        ]

    def __str__(self):
        return f"{self.name} | Balance: {self.balance}"


class CompanyWalletTransaction(models.Model):
    class TransactionType(models.TextChoices):
        RESERVE_DEPOSIT = "reserve_deposit", "Reserve Deposit"
        SETTLEMENT_FUNDING = "settlement_funding", "Settlement Funding"
        PROFIT_TRANSFER = "profit_transfer", "Profit Transfer"
        COMPANY_CASHOUT = "company_cashout", "Company Cashout"
        ADJUSTMENT = "adjustment", "Adjustment"

    company_wallet = models.ForeignKey(
        CompanyWallet,
        on_delete=models.PROTECT,
        related_name="transactions",
    )

    transaction_type = models.CharField(max_length=40, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=18, decimal_places=2)

    balance_before = models.DecimalField(max_digits=18, decimal_places=2)
    balance_after = models.DecimalField(max_digits=18, decimal_places=2)

    reference_table = models.CharField(max_length=100, null=True, blank=True)
    reference_id = models.PositiveBigIntegerField(null=True, blank=True)

    description = models.TextField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_company_wallet_transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} | {self.amount}"


class CompanyCashoutRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PAID = "paid", "Paid"

    company_wallet = models.ForeignKey(
        CompanyWallet,
        on_delete=models.PROTECT,
        related_name="cashout_requests",
    )

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="requested_company_cashouts",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="approved_company_cashouts",
    )

    amount = models.DecimalField(max_digits=18, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    reason = models.TextField(null=True, blank=True)
    admin_note = models.TextField(null=True, blank=True)

    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Company Cashout {self.amount} | {self.status}"