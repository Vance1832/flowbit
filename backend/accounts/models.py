from django.contrib.auth.models import AbstractUser
from django.db import models

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
