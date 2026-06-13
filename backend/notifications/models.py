from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        DEPOSIT = "deposit", "Deposit"
        WITHDRAWAL = "withdrawal", "Withdrawal"
        RECEIPT = "receipt", "Receipt"
        RESULT = "result", "Result"
        SETTLEMENT = "settlement", "Settlement"
        PASSWORD_RESET = "password_reset", "Password Reset"
        SYSTEM = "system", "System"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="notifications",
    )

    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=150)
    message = models.TextField()

    is_read = models.BooleanField(default=False)

    reference_table = models.CharField(max_length=100, null=True, blank=True)
    reference_id = models.PositiveBigIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.name} | {self.title}"