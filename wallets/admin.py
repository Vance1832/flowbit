from django.contrib import admin
from .models import (
    UserWallet,
    WalletTransaction,
    DepositRequest,
    WithdrawalRequest,
    SystemSetting,
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
    readonly_fields = ("created_at",)


@admin.register(DepositRequest)
class DepositRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "amount", "status", "reviewed_by", "reviewed_at", "created_at")
    list_filter = ("status", "created_at", "reviewed_at")
    search_fields = ("user__name", "user__phone")
    readonly_fields = ("created_at", "updated_at")


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "amount", "status", "reviewed_by", "paid_by", "created_at")
    list_filter = ("status", "created_at", "reviewed_at", "paid_at")
    search_fields = ("user__name", "user__phone", "payment_account_name", "payment_account_number")
    readonly_fields = ("created_at", "updated_at")


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "setting_key", "setting_value", "updated_by", "updated_at")
    search_fields = ("setting_key", "setting_value")
    readonly_fields = ("updated_at",)