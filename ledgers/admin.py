from django.contrib import admin
from .models import ResultPeriod, Ledger, LedgerNumber, LedgerPriorityHistory


@admin.register(ResultPeriod)
class ResultPeriodAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "code",
        "name",
        "result_date",
        "result_number",
        "status",
        "is_visible_to_users",
        "created_by",
        "created_at",
    )
    list_filter = ("status", "result_source", "is_visible_to_users", "result_date")
    search_fields = ("code", "name", "result_number")

    readonly_fields = (
        "created_by",
        "created_at",
        "updated_at",
        "result_entered_at",
        "result_voided_at",
    )

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Ledger)
class LedgerAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "result_period",
        "capacity_per_number",
        "settlement_rate",
        "priority_order",
        "status",
        "open_at",
        "close_at",
        "created_by",
    )
    list_filter = ("status", "result_period")
    search_fields = ("name", "result_period__code")

    readonly_fields = (
        "created_by",
        "created_at",
        "updated_at",
        "manually_closed_at",
    )

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(LedgerNumber)
class LedgerNumberAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "ledger",
        "number_code",
        "max_capacity",
        "used_amount",
        "remaining_amount",
        "updated_at",
    )
    list_filter = ("ledger",)
    search_fields = ("number_code", "ledger__name")
    readonly_fields = ("updated_at",)


@admin.register(LedgerPriorityHistory)
class LedgerPriorityHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "ledger",
        "old_priority",
        "new_priority",
        "changed_by",
        "changed_at",
    )
    list_filter = ("changed_at",)
    search_fields = ("ledger__name", "changed_by__name")
    readonly_fields = ("changed_at",)