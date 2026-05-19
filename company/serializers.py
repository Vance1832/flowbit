from rest_framework import serializers
from .models import CompanyWallet, CompanyWalletTransaction, CompanyCashoutRequest


class CompanyWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyWallet
        fields = "__all__"


class CompanyWalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyWalletTransaction
        fields = "__all__"


class CompanyCashoutRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyCashoutRequest
        fields = "__all__"
        read_only_fields = (
            "approved_by",
            "approved_at",
            "paid_at",
            "created_at",
            "updated_at",
        )


class ReserveDepositSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=18, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value