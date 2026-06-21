from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .managers import UserManager
from .validators import normalize_phone_parts


class User(AbstractUser):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DEACTIVATED = "deactivated", "Deactivated"
        SUSPENDED = "suspended", "Suspended"

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        STAFF = "staff", "Staff"
        USER = "user", "User"
        VIP_USER = "vip_user", "VIP User"

    username = None

    name = models.CharField(max_length=100)

    phone_country_code = models.CharField(max_length=5, default="+66")
    phone_number = models.CharField(max_length=30)

    # normalized phone used for login/search/OTP
    phone = models.CharField(max_length=40, unique=True)

    email = models.EmailField(unique=True, null=True, blank=True)

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    phone_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)

    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    deactivated_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["name"]

    def save(self, *args, **kwargs):
        country_code, number, full_phone = normalize_phone_parts(
            self.phone_country_code,
            self.phone_number,
        )

        self.phone_country_code = country_code
        self.phone_number = number
        self.phone = full_phone

        if self.email == "":
            self.email = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.phone})"


class OtpCode(models.Model):
    """A one-time code for phone-based flows (password reset, phone verification).

    The code itself is never stored in plaintext — only a salted hash. Codes
    are single-use, short-lived, and capped at a few verification attempts to
    resist brute force over the small 6-digit space. `purpose` scopes a code to
    one flow so a reset code can't be used to verify a phone, and vice versa.
    """

    class Purpose(models.TextChoices):
        PASSWORD_RESET = "password_reset", "Password Reset"
        PHONE_VERIFICATION = "phone_verification", "Phone Verification"

    phone = models.CharField(max_length=40, db_index=True)
    purpose = models.CharField(
        max_length=30,
        choices=Purpose.choices,
        default=Purpose.PASSWORD_RESET,
    )
    code_hash = models.CharField(max_length=255)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["phone", "-created_at"])]

    def is_usable(self, max_attempts: int) -> bool:
        return (
            self.consumed_at is None
            and self.attempts < max_attempts
            and self.expires_at > timezone.now()
        )

    def __str__(self):
        return f"OTP {self.phone} ({self.purpose}, expires {self.expires_at:%Y-%m-%d %H:%M})"
