from rest_framework import serializers
from .models import (
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

    def validate_amount(self, value):
        if value < 1000:
            raise serializers.ValidationError("Minimum deposit amount is 1000.")
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
        if value < 1000:
            raise serializers.ValidationError("Minimum withdrawal amount is 1000.")
        return value
    
