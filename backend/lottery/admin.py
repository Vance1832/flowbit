from django.contrib import admin

from .models import LotteryDraw


@admin.register(LotteryDraw)
class LotteryDrawAdmin(admin.ModelAdmin):
    list_display = ("draw_date", "three_up", "first_prize", "source", "fetched_at")
    list_filter = ("source",)
    search_fields = ("draw_date", "three_up", "first_prize")
    ordering = ("-draw_date",)
