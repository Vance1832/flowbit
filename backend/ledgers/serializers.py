from rest_framework import serializers
from .models import ResultPeriod, Ledger, LedgerNumber


class UserVisibleResultSerializer(serializers.Serializer):
    period_code = serializers.CharField()
    result_date = serializers.DateField()
    result_number = serializers.CharField()
    status = serializers.CharField(required=False)
    my_receipt_status = serializers.CharField(required=False)
    matched_receipt_no = serializers.CharField(required=False, allow_null=True)
    matched_number = serializers.CharField(required=False, allow_null=True)
    matched_amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=False, allow_null=True)
    settlement_amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=False, allow_null=True)
    wallet_credit_status = serializers.CharField(required=False, allow_null=True)


class UserCurrentResultPeriodSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    result_date = serializers.DateField()
    default_close_time = serializers.TimeField()
    status = serializers.CharField()
    betting_open = serializers.BooleanField()
    betting_closes_at = serializers.DateTimeField(allow_null=True)


class UserLatestVisibleResultSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    result_date = serializers.DateField()
    result_number = serializers.CharField()
    settled_at = serializers.DateTimeField()
    visible_until = serializers.DateTimeField()


class UserResultOverviewSerializer(serializers.Serializer):
    current_open_period = UserCurrentResultPeriodSerializer(allow_null=True)
    latest_visible_result = UserLatestVisibleResultSerializer(allow_null=True)
    recent_results = UserVisibleResultSerializer(many=True)


class ResultPeriodSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)

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
    result_period_code = serializers.CharField(source="result_period.code", read_only=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)

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


class EnterResultSerializer(serializers.Serializer):
    result_number = serializers.CharField(max_length=3)
    # How the number was sourced. "manual" = typed; "api_checked_manual_confirmed"
    # = the official fetched number, confirmed by a human (verified server-side).
    result_source = serializers.ChoiceField(
        choices=[
            ResultPeriod.ResultSource.MANUAL,
            ResultPeriod.ResultSource.API_CHECKED_MANUAL_CONFIRMED,
        ],
        default=ResultPeriod.ResultSource.MANUAL,
    )

    def validate_result_number(self, value):
        value = str(value).strip()

        if len(value) != 3 or not value.isdigit():
            raise serializers.ValidationError("Result number must be exactly 3 digits.")

        return value
