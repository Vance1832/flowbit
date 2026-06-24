from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from config.image_validation import validate_image_upload
from .models import KycSubmission, ResponsibleGamblingControl


class ResponsibleGamblingControlSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResponsibleGamblingControl
        fields = ("daily_deposit_limit", "daily_stake_limit", "self_excluded_until", "updated_at")
        read_only_fields = ("updated_at",)

    def validate_daily_deposit_limit(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Limit cannot be negative.")
        return value

    def validate_daily_stake_limit(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Limit cannot be negative.")
        return value


class KycSubmissionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)
    user_phone = serializers.CharField(source="user.phone", read_only=True)

    class Meta:
        model = KycSubmission
        fields = (
            "id",
            "user",
            "user_name",
            "user_phone",
            "document_type",
            "document_number",
            "document_image",
            "status",
            "review_note",
            "reviewed_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "user",
            "user_name",
            "user_phone",
            "status",
            "review_note",
            "reviewed_at",
            "created_at",
        )

    def validate_document_image(self, value):
        try:
            validate_image_upload(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages)
        return value


class KycReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[KycSubmission.Status.APPROVED, KycSubmission.Status.REJECTED]
    )
    review_note = serializers.CharField(required=False, allow_blank=True)
