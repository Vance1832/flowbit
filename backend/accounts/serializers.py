from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from audit.models import AuditLog
from audit.services import create_audit_log
from wallets.models import UserWallet

from .validators import normalize_phone_parts


User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "id",
            "name",
            "phone_country_code",
            "phone_number",
            "phone",
            "email",
            "password",
            "confirm_password",
        )
        read_only_fields = ("id", "phone")

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError("Passwords do not match.")

        country_code, phone_number, full_phone = normalize_phone_parts(
            attrs.get("phone_country_code", ""),
            attrs.get("phone_number", ""),
        )

        attrs["phone_country_code"] = country_code
        attrs["phone_number"] = phone_number

        if User.objects.filter(phone=full_phone).exists():
            raise serializers.ValidationError({"phone_number": ["A user with this phone number already exists."]})

        email = attrs.get("email")
        if email == "":
            attrs["email"] = None

        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.role = User.Role.USER
        user.status = User.Status.ACTIVE
        user.save()

        UserWallet.objects.get_or_create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "name",
            "phone_country_code",
            "phone_number",
            "phone",
            "email",
            "role",
            "status",
            "phone_verified",
            "email_verified",
        )
        read_only_fields = fields


class AdminUserSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(source="date_joined", read_only=True)
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    confirm_password = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "name",
            "phone_country_code",
            "phone_number",
            "phone",
            "email",
            "role",
            "status",
            "phone_verified",
            "email_verified",
            "created_at",
            "password",
            "confirm_password",
        )
        read_only_fields = (
            "id",
            "phone",
            "phone_verified",
            "email_verified",
            "created_at",
        )

    def validate_role(self, value):
        if value == User.Role.OWNER:
            raise serializers.ValidationError("Owner accounts must be created manually by system administrator.")
        return value

    def validate_status(self, value):
        if value not in [User.Status.ACTIVE, User.Status.DEACTIVATED]:
            raise serializers.ValidationError("Status must be active or deactivated.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        if instance and instance.role == User.Role.OWNER:
            raise serializers.ValidationError("Owner accounts must be managed manually by system administrator.")

        password = attrs.get("password")
        confirm_password = attrs.get("confirm_password")

        if self.instance is None:
            if not password or not confirm_password:
                raise serializers.ValidationError(
                    {"password": ["Password and confirm password are required."]}
                )
        elif password or confirm_password:
            raise serializers.ValidationError(
                "Use the reset password action to change account passwords."
            )

        if password and confirm_password and password != confirm_password:
            raise serializers.ValidationError("Passwords do not match.")

        country_code = attrs.get(
            "phone_country_code",
            instance.phone_country_code if instance else "",
        )
        phone_number = attrs.get(
            "phone_number",
            instance.phone_number if instance else "",
        )

        normalized_country_code, normalized_phone_number, full_phone = normalize_phone_parts(
            country_code,
            phone_number,
        )
        attrs["phone_country_code"] = normalized_country_code
        attrs["phone_number"] = normalized_phone_number

        duplicate_qs = User.objects.filter(phone=full_phone)
        if instance is not None:
            duplicate_qs = duplicate_qs.exclude(pk=instance.pk)
        if duplicate_qs.exists():
            raise serializers.ValidationError({"phone_number": ["A user with this phone number already exists."]})

        email = attrs.get("email")
        if email == "":
            attrs["email"] = None

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.pop("confirm_password", None)

        user = User(**validated_data)
        user.set_password(password)
        user.status = validated_data.get("status", User.Status.ACTIVE)

        if user.role in [User.Role.ADMIN, User.Role.OWNER]:
            user.is_staff = True

        user.save()
        UserWallet.objects.get_or_create(user=user)

        create_audit_log(
            actor_user=self.context["request"].user,
            action=AuditLog.ActionType.CREATE,
            target_table="users",
            target_id=user.id,
            new_values={
                "name": user.name,
                "phone": user.phone,
                "role": user.role,
                "status": user.status,
            },
            reason="User created from owner user management.",
        )

        return user

    def update(self, instance, validated_data):
        validated_data.pop("password", None)
        validated_data.pop("confirm_password", None)

        old_values = {
            "name": instance.name,
            "phone": instance.phone,
            "email": instance.email,
            "role": instance.role,
            "status": instance.status,
        }

        for field in ["name", "phone_country_code", "phone_number", "email", "role", "status"]:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        if "role" in validated_data:
            instance.is_staff = instance.role in [User.Role.ADMIN, User.Role.OWNER]

        instance.deactivated_at = None if instance.status == User.Status.ACTIVE else instance.deactivated_at
        instance.save()
        UserWallet.objects.get_or_create(user=instance)

        create_audit_log(
            actor_user=self.context["request"].user,
            action=AuditLog.ActionType.UPDATE,
            target_table="users",
            target_id=instance.id,
            old_values=old_values,
            new_values={
                "name": instance.name,
                "phone": instance.phone,
                "email": instance.email,
                "role": instance.role,
                "status": instance.status,
            },
            reason="User updated from owner user management.",
        )

        return instance


class ResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField(min_length=8)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError("Passwords do not match.")
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField(min_length=8)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "New passwords do not match."}
            )
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password must be different from the current one."}
            )
        return attrs


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "phone"

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["name"] = user.name
        token["phone"] = user.phone
        token["role"] = user.role

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        data["user"] = {
            "id": self.user.id,
            "name": self.user.name,
            "phone": self.user.phone,
            "role": self.user.role,
            "status": self.user.status,
        }

        return data
