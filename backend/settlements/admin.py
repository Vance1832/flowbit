from django.contrib import admin
from django.utils import timezone
from .models import SettlementBatch, SettlementItem, SettlementItemSource


class SettlementItemInline(admin.TabularInline):
    model = SettlementItem
    extra = 0
    readonly_fields = ("created_at", "paid_at")


@admin.register(SettlementBatch)
class SettlementBatchAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "result_period",
        "result_number",
        "total_collected",
        "total_settlement",
        "company_reserve_required",
        "company_reserve_used",
        "final_profit_loss",
        "status",
        "previewed_by",
        "previewed_at",
        "approved_by",
        "approved_at",
    )
    list_filter = ("status", "result_period", "previewed_at", "approved_at")
    search_fields = ("result_period__code", "result_number")
    readonly_fields = (
        "previewed_by",
        "previewed_at",
        "approved_by",
        "approved_at",
        "paid_at",
        "voided_by",
        "voided_at",
        "created_at",
    )
    inlines = [SettlementItemInline]

    def save_model(self, request, obj, form, change):
        if not obj.previewed_by_id:
            obj.previewed_by = request.user
        if not obj.previewed_at:
            obj.previewed_at = timezone.now()
        super().save_model(request, obj, form, change)


@admin.register(SettlementItem)
class SettlementItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "settlement_batch",
        "user",
        "number_code",
        "total_matched_amount",
        "settlement_rate",
        "settlement_amount",
        "status",
        "paid_at",
    )
    list_filter = ("status", "number_code", "paid_at")
    search_fields = ("user__name", "user__phone", "number_code", "settlement_batch__result_period__code")
    readonly_fields = ("created_at", "paid_at")


@admin.register(SettlementItemSource)
class SettlementItemSourceAdmin(admin.ModelAdmin):
    list_display = ("id", "settlement_item", "receipt_item", "matched_amount")
    search_fields = (
        "settlement_item__user__name",
        "settlement_item__number_code",
        "receipt_item__receipt__receipt_no",
    )
