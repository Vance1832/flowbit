from rest_framework import serializers
from .models import ResultPeriod, Ledger, LedgerNumber


class UserVisibleResultSerializer(serializers.Serializer):
    result_date = serializers.DateField()
    result_number = serializers.CharField()
    status = serializers.CharField(required=False)


class ResultPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResultPeriod
        fields = "__all__"
        read_only_fields = (
            "result_entered_by",
            "result_entered_at",
            "result_voided_by",
            "result_voided_at",
            "created_by",
            "created_at",
            "updated_at",
        )


class LedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ledger
        fields = "__all__"
        read_only_fields = (
            "manually_closed_by",
            "manually_closed_at",
            "created_by",
            "created_at",
            "updated_at",
        )


class LedgerNumberSerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerNumber
        fields = "__all__"
        read_only_fields = fields


class EnterResultSerializer(serializers.Serializer):
    result_number = serializers.CharField(max_length=3)

    def validate_result_number(self, value):
        value = str(value).strip()

        if len(value) != 3 or not value.isdigit():
            raise serializers.ValidationError("Result number must be exactly 3 digits.")

        return value