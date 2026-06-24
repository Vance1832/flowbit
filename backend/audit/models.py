from django.conf import settings
from django.db import models

from .hashing import GENESIS_HASH, compute_entry_hash, entry_content


class AppendOnlyError(Exception):
    """Raised on any attempt to modify or delete an append-only audit entry."""


class AuditLogQuerySet(models.QuerySet):
    def update(self, *args, **kwargs):
        raise AppendOnlyError("Audit log entries are immutable; bulk update is not allowed.")

    def delete(self, *args, **kwargs):
        raise AppendOnlyError("Audit log entries are append-only; delete is not allowed.")


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

    # Tamper-evident hash chain (see audit.hashing).
    prev_hash = models.CharField(max_length=64, blank=True, default="")
    entry_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)

    # `objects` is append-only (blocks update/delete). `unsafe_objects` is an
    # explicit, greppable escape hatch for legitimate maintenance (production
    # reset, dev cleanup) and for Django's internal/base-manager operations.
    objects = AuditLogQuerySet.as_manager()
    unsafe_objects = models.Manager()

    class Meta:
        base_manager_name = "unsafe_objects"

    def _content(self):
        return entry_content(
            actor_user_id=self.actor_user_id,
            action=self.action,
            target_table=self.target_table,
            target_id=self.target_id,
            old_values=self.old_values,
            new_values=self.new_values,
            ip_address=self.ip_address,
            user_agent=self.user_agent,
            reason=self.reason,
        )

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise AppendOnlyError(
                "Audit log entries are immutable; an existing entry cannot be modified."
            )
        if not self.entry_hash:
            last = AuditLog.objects.order_by("-id").first()
            self.prev_hash = last.entry_hash if last else GENESIS_HASH
            self.entry_hash = compute_entry_hash(self.prev_hash, self._content())
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise AppendOnlyError("Audit log entries are append-only; delete is not allowed.")

    def __str__(self):
        actor = self.actor_user.name if self.actor_user else "System"
        return f"{actor} | {self.action} | {self.created_at}"
