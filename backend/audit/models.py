from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    class ActionType(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        CLOSE = "close", "Close"
        APPROVE = "approve", "Approve"
        REJECT = "reject", "Reject"
        VOID = "void", "Void"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        DEACTIVATE = "deactivate", "Deactivate"
        CASHOUT = "cashout", "Cashout"
        OVERRIDE = "override", "Override"
        RESERVE_DEPOSIT = "reserve_deposit", "Reserve Deposit"
        SETTLEMENT = "settlement", "Settlement"
        RESULT_ENTRY = "result_entry", "Result Entry"
        PASSWORD_RESET = "password_reset", "Password Reset"

    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    action = models.CharField(max_length=40, choices=ActionType.choices)

    target_table = models.CharField(max_length=100, null=True, blank=True)
    target_id = models.PositiveBigIntegerField(null=True, blank=True)

    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)

    ip_address = models.CharField(max_length=100, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    reason = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        actor = self.actor_user.name if self.actor_user else "System"
        return f"{actor} | {self.action} | {self.created_at}"
