from rest_framework import serializers
from .models import (
    Ledger,
    LedgerNumber,
    LedgerTemplate,
    LedgerTemplateTier,
    PeriodSchedule,
    ResultPeriod,
)


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

        # 2 or 3 digits; the exact length for the period's bet type is enforced
        # in the settlement service.
        if len(value) not in (2, 3) or not value.isdigit():
            raise serializers.ValidationError("Result number must be 2 or 3 digits.")

        return value


class LedgerTemplateTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerTemplateTier
        fields = ("id", "name", "capacity_per_number", "settlement_rate", "priority_order")


class LedgerTemplateSerializer(serializers.ModelSerializer):
    tiers = LedgerTemplateTierSerializer(many=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)

    class Meta:
        model = LedgerTemplate
        fields = ("id", "name", "tiers", "created_by_name", "created_at", "updated_at")
        read_only_fields = ("id", "created_by_name", "created_at", "updated_at")

    def validate_tiers(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one tier.")
        return value

    def create(self, validated_data):
        tiers = validated_data.pop("tiers")
        template = LedgerTemplate.objects.create(**validated_data)
        for tier in tiers:
            LedgerTemplateTier.objects.create(template=template, **tier)
        return template

    def update(self, instance, validated_data):
        tiers = validated_data.pop("tiers", None)
        instance.name = validated_data.get("name", instance.name)
        instance.save()
        if tiers is not None:
            instance.tiers.all().delete()
            for tier in tiers:
                LedgerTemplateTier.objects.create(template=instance, **tier)
        return instance


class BuildLedgersSerializer(serializers.Serializer):
    template_id = serializers.IntegerField()


class PeriodScheduleSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source="template.name", read_only=True)
    updated_by_name = serializers.CharField(source="updated_by.name", read_only=True)

    class Meta:
        model = PeriodSchedule
        fields = (
            "is_enabled",
            "template",
            "template_name",
            "default_close_time",
            "days_ahead",
            "active_weekdays",
            "code_prefix",
            "last_run_at",
            "updated_by_name",
            "updated_at",
        )
        read_only_fields = ("last_run_at", "updated_by_name", "updated_at")

    def validate_active_weekdays(self, value):
        parts = [p.strip() for p in (value or "").split(",") if p.strip()]
        if not parts:
            raise serializers.ValidationError("Select at least one weekday.")
        for part in parts:
            if not part.isdigit() or not (0 <= int(part) <= 6):
                raise serializers.ValidationError(
                    "Weekdays must be numbers 0 (Mon) through 6 (Sun)."
                )
        # Normalize: unique, sorted.
        return ",".join(str(n) for n in sorted({int(p) for p in parts}))

    def validate_days_ahead(self, value):
        if value > 14:
            raise serializers.ValidationError("Keep the horizon to 14 days or fewer.")
        return value

    def validate(self, attrs):
        # Resolve the post-update state so we can check "enabled" coherently
        # whether or not each field is part of this PATCH.
        enabled = attrs.get(
            "is_enabled", getattr(self.instance, "is_enabled", False)
        )
        template = attrs.get("template", getattr(self.instance, "template", None))
        close_time = attrs.get(
            "default_close_time", getattr(self.instance, "default_close_time", None)
        )

        if enabled and template is None:
            raise serializers.ValidationError(
                {"template": "Choose a ledger template before enabling scheduling."}
            )
        if enabled and close_time is None:
            raise serializers.ValidationError(
                {"default_close_time": "Set a close time before enabling scheduling."}
            )
        return attrs
