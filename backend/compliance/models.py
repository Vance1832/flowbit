from django.conf import settings
from django.db import models
from django.utils import timezone


class ResponsibleGamblingControl(models.Model):
    """Per-user responsible-gambling limits and self-exclusion.

    Limits are opt-in: a null limit means "no limit". Amounts are daily caps.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rg_control",
    )
    daily_deposit_limit = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    daily_stake_limit = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    # Self-exclusion: blocks deposits and betting until this moment passes.
    self_excluded_until = models.DateTimeField(null=True, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    def is_self_excluded(self) -> bool:
        return self.self_excluded_until is not None and self.self_excluded_until > timezone.now()

    def __str__(self):
        return f"RG control for {self.user_id}"


class KycSubmission(models.Model):
    """An identity-verification submission, reviewed by staff/owner (AML/KYC)."""

    class DocumentType(models.TextChoices):
        NRC = "nrc", "NRC"
        PASSPORT = "passport", "Passport"
        DRIVER_LICENSE = "driver_license", "Driver License"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="kyc_submissions",
    )
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    document_number = models.CharField(max_length=100)
    document_image = models.ImageField(upload_to="kyc/")

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    review_note = models.TextField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reviewed_kyc_submissions",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"KYC {self.user_id} | {self.document_type} | {self.status}"
