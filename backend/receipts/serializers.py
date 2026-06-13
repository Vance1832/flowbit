from rest_framework import serializers

from .models import Receipt, ReceiptItem


class ReceiptItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReceiptItem
        fields = (
            "id",
            "number_code",
            "amount",
            "is_generated_by_r",
            "source_input",
            "created_at",
        )


class ReceiptSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(many=True, read_only=True)
    result_period_code = serializers.CharField(source="result_period.code", read_only=True)

    class Meta:
        model = Receipt
        fields = (
            "id",
            "receipt_no",
            "result_period",
            "result_period_code",
            "total_amount",
            "status",
            "paid_at",
            "created_at",
            "items",
        )


class SubmitReceiptItemSerializer(serializers.Serializer):
    number_code = serializers.CharField(max_length=3)
    amount = serializers.DecimalField(max_digits=18, decimal_places=2)
    use_r = serializers.BooleanField(required=False, default=False)

    def validate_number_code(self, value):
        value = str(value).strip()

        if len(value) != 3 or not value.isdigit():
            raise serializers.ValidationError("Number must be exactly 3 digits.")

        return value

    def validate_amount(self, value):
        if value < 500:
            raise serializers.ValidationError("Minimum amount is 500.")

        return value


class SubmitReceiptSerializer(serializers.Serializer):
    result_period_code = serializers.CharField(max_length=50)
    items = SubmitReceiptItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")

        return value
