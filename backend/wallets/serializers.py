import re
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import (
    SystemSetting,
    UserWallet,
    WalletTransaction,
    DepositRequest,
    WithdrawalRequest,
)


class UserWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserWallet
        fields = ("id", "balance", "locked_balance", "created_at", "updated_at")
        read_only_fields = fields


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = (
            "id",
            "transaction_type",
            "amount",
            "balance_before",
            "balance_after",
            "reference_table",
            "reference_id",
            "description",
            "created_at",
        )
        read_only_fields = fields


class DepositRequestSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)
    user_phone = serializers.CharField(source="user.phone", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.name", read_only=True)
    # Write the uploaded file via `proof_image`; read the served location via
    # `proof_image_url` (absolute when the request is in serializer context).
    proof_image = serializers.ImageField(write_only=True, required=False, allow_null=True)
    proof_image_url = serializers.SerializerMethodField()

    class Meta:
        model = DepositRequest
        fields = (
            "id",
            "user_name",
            "user_phone",
            "amount",
            "payment_method",
            "sender_account_name",
            "transaction_reference",
            "proof_image",
            "proof_image_url",
            "user_note",
            "staff_note",
            "status",
            "assigned_to",
            "assigned_to_name",
            "assigned_at",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "staff_note",
            "status",
            "assigned_to",
            "assigned_at",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        )

    def get_proof_image_url(self, obj):
        if not obj.proof_image:
            return None
        request = self.context.get("request")
        url = obj.proof_image.url
        return request.build_absolute_uri(url) if request else url

    def validate_proof_image(self, value):
        from config.image_validation import validate_image_upload

        try:
            validate_image_upload(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages)
        return value

    def validate_amount(self, value):
        from .services import get_decimal_setting

        minimum = get_decimal_setting("minimum_deposit", 1000)
        if value < minimum:
            raise serializers.ValidationError(
                f"Minimum deposit amount is {minimum:f}."
            )
        return value


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)
    user_phone = serializers.CharField(source="user.phone", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.name", read_only=True)
    paid_by_name = serializers.CharField(source="paid_by.name", read_only=True)

    class Meta:
        model = WithdrawalRequest
        fields = (
            "id",
            "user_name",
            "user_phone",
            "amount",
            "payment_account_name",
            "payment_account_number",
            "payment_method",
            "user_note",
            "staff_note",
            "status",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "paid_by",
            "paid_by_name",
            "paid_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "staff_note",
            "status",
            "reviewed_by",
            "reviewed_at",
            "paid_by",
            "paid_at",
            "created_at",
            "updated_at",
        )

    def validate_amount(self, value):
        from .services import get_decimal_setting

        minimum = get_decimal_setting("minimum_withdrawal", 10000)
        if value < minimum:
            raise serializers.ValidationError(
                f"Minimum withdrawal amount is {minimum:f}."
            )
        return value


NUMERIC_SETTING_KEYS = {
    "minimum_deposit",
    "minimum_withdrawal",
    "default_settlement_rate",
}


class SystemSettingSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source="updated_by.name", read_only=True)

    class Meta:
        model = SystemSetting
        fields = (
            "id",
            "setting_key",
            "setting_value",
            "description",
            "updated_by_name",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "setting_key",
            "description",
            "updated_by_name",
            "updated_at",
        )

    def validate_setting_value(self, value):
        key = self.instance.setting_key if self.instance else None

        if key in NUMERIC_SETTING_KEYS:
            try:
                if Decimal(str(value)) <= 0:
                    raise serializers.ValidationError("Value must be greater than 0.")
            except (InvalidOperation, ValueError, TypeError):
                raise serializers.ValidationError("Value must be a number.")

        if key == "default_close_time" and not re.match(
            r"^\d{2}:\d{2}(:\d{2})?$", str(value)
        ):
            raise serializers.ValidationError("Use HH:MM or HH:MM:SS format.")

        if key == "maintenance_mode" and str(value).lower() not in ("true", "false"):
            raise serializers.ValidationError("Value must be 'true' or 'false'.")

        return value

