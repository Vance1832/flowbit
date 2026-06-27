from rest_framework import serializers

from .models import LotteryDraw


class LotteryDrawSerializer(serializers.ModelSerializer):
    class Meta:
        model = LotteryDraw
        fields = ("draw_date", "three_up", "source")
