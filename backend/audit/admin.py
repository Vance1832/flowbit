from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "actor_user",
        "action",
        "target_table",
        "target_id",
        "created_at",
    )
    list_filter = ("action", "created_at")
    search_fields = (
        "actor_user__name",
        "actor_user__phone",
        "target_table",
        "reason",
    )
    readonly_fields = (
        "actor_user",
        "action",
        "target_table",
        "target_id",
        "old_values",
        "new_values",
        "ip_address",
        "user_agent",
        "reason",
        "created_at",
    )