from django.contrib import admin
from accounts.models import User
from .models import (
    UserWallet,
    WalletTransaction,
    DepositRequest,
    WithdrawalRequest,
    SystemSetting,
)


STAFF_ADMIN_OWNER_ROLES = (
    User.Role.STAFF,
    User.Role.ADMIN,
    User.Role.OWNER,
)


@admin.register(UserWallet)
class UserWalletAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "balance", "locked_balance", "created_at", "updated_at")
    search_fields = ("user__name", "user__phone")
    readonly_fields = ("created_at", "updated_at")


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "transaction_type",
        "amount",
        "balance_before",
        "balance_after",
        "created_by",
        "created_at",
    )
    list_filter = ("transaction_type", "created_at")
    search_fields = ("user__name", "user__phone", "description")
    readonly_fields = ("created_by", "created_at")

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(DepositRequest)
class DepositRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "amount",
        "payment_method",
        "transaction_reference",
        "status",
        "assigned_to",
        "reviewed_by",
        "reviewed_at",
        "created_at",
    )
    list_filter = ("status", "payment_method", "assigned_to", "created_at", "reviewed_at")
    search_fields = (
        "user__name",
        "user__phone",
        "sender_account_name",
        "transaction_reference",
    )
    readonly_fields = (
        "assigned_at",
        "reviewed_by",
        "reviewed_at",
        "created_at",
        "updated_at",
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "assigned_to":
            kwargs["queryset"] = User.objects.filter(
                role__in=STAFF_ADMIN_OWNER_ROLES
            ).order_by("role", "name", "id")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "amount", "status", "reviewed_by", "paid_by", "created_at")
    list_filter = ("status", "created_at", "reviewed_at", "paid_at")
    search_fields = ("user__name", "user__phone", "payment_account_name", "payment_account_number")
    readonly_fields = (
        "reviewed_by",
        "reviewed_at",
        "paid_by",
        "paid_at",
        "created_at",
        "updated_at",
    )


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "setting_key", "setting_value", "updated_by", "updated_at")
    search_fields = ("setting_key", "setting_value")
    readonly_fields = ("updated_by", "updated_at")

    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
