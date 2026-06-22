from django.contrib import admin

from .models import KycSubmission, ResponsibleGamblingControl


@admin.register(ResponsibleGamblingControl)
class ResponsibleGamblingControlAdmin(admin.ModelAdmin):
    list_display = ("user", "daily_deposit_limit", "daily_stake_limit", "self_excluded_until")
    search_fields = ("user__phone", "user__name")


@admin.register(KycSubmission)
class KycSubmissionAdmin(admin.ModelAdmin):
    list_display = ("user", "document_type", "status", "reviewed_by", "created_at")
    list_filter = ("status", "document_type")
    search_fields = ("user__phone", "user__name", "document_number")
