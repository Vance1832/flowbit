from django.contrib import admin
from .models import (
    Receipt,
    ReceiptItem,
    PaidNumberAllocation,
    RGeneratedGroup,
    RGeneratedItem,
)


class ReceiptItemInline(admin.TabularInline):
    model = ReceiptItem
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "receipt_no",
        "user",
        "result_period",
        "total_amount",
        "status",
        "paid_at",
        "created_at",
    )
    list_filter = ("status", "result_period", "paid_at")
    search_fields = ("receipt_no", "user__name", "user__phone")
    readonly_fields = ("voided_by", "voided_at", "created_at")
    inlines = [ReceiptItemInline]


@admin.register(ReceiptItem)
class ReceiptItemAdmin(admin.ModelAdmin):
    list_display = ("id", "receipt", "number_code", "amount", "is_generated_by_r", "source_input", "created_at")
    list_filter = ("is_generated_by_r", "number_code")
    search_fields = ("receipt__receipt_no", "number_code")
    readonly_fields = ("created_at",)


@admin.register(PaidNumberAllocation)
class PaidNumberAllocationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "receipt_item",
        "ledger",
        "ledger_number",
        "number_code",
        "allocated_amount",
        "allocation_order",
        "created_at",
    )
    list_filter = ("ledger", "number_code")
    search_fields = ("receipt_item__receipt__receipt_no", "number_code", "ledger__name")
    readonly_fields = ("created_at",)


@admin.register(RGeneratedGroup)
class RGeneratedGroupAdmin(admin.ModelAdmin):
    list_display = ("id", "receipt", "source_number", "source_text", "amount_per_number", "generated_count", "total_amount", "created_at")
    search_fields = ("receipt__receipt_no", "source_number", "source_text")
    readonly_fields = ("created_at",)


@admin.register(RGeneratedItem)
class RGeneratedItemAdmin(admin.ModelAdmin):
    list_display = ("id", "group", "receipt_item", "number_code", "amount", "created_at")
    search_fields = ("group__source_text", "number_code")
    readonly_fields = ("created_at",)
