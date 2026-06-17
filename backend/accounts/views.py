from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.models import AuditLog
from audit.services import create_audit_log

from .permissions import IsOwner
from .serializers import (
    AdminUserSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    ResetPasswordSerializer,
    UserProfileSerializer,
    UserRegisterSerializer,
)


User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={"request": request})
        return Response(serializer.data)


MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB


class AvatarUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response(
                {"avatar": ["No file was uploaded."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if avatar.size > MAX_AVATAR_BYTES:
            return Response(
                {"avatar": ["Image must be 5 MB or smaller."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not (avatar.content_type or "").startswith("image/"):
            return Response(
                {"avatar": ["File must be an image."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        user.avatar = avatar
        user.save(update_fields=["avatar"])

        create_audit_log(
            actor_user=user,
            action=AuditLog.ActionType.UPDATE,
            target_table="users",
            target_id=user.id,
            reason="User updated their profile picture.",
        )

        return Response(
            UserProfileSerializer(user, context={"request": request}).data
        )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    if not user.check_password(serializer.validated_data["current_password"]):
        return Response(
            {"current_password": ["Current password is incorrect."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(serializer.validated_data["new_password"])
    user.save(update_fields=["password"])

    create_audit_log(
        actor_user=user,
        action=AuditLog.ActionType.PASSWORD_RESET,
        target_table="users",
        target_id=user.id,
        reason="User changed their own password.",
    )

    return Response({"detail": "Password changed successfully."})


class AdminUserListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsOwner]

    def get_queryset(self):
        return User.objects.all().order_by("role", "-date_joined", "-id")


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsOwner]

    def get_queryset(self):
        return User.objects.all()


@api_view(["POST"])
@permission_classes([IsOwner])
def admin_reset_user_password(request, pk):
    user = get_object_or_404(User, pk=pk)
    if user.role == User.Role.OWNER:
        return Response(
            {"detail": "Owner accounts must be managed manually by system administrator."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = ResetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user.set_password(serializer.validated_data["new_password"])
    user.save(update_fields=["password"])

    create_audit_log(
        actor_user=request.user,
        action=AuditLog.ActionType.PASSWORD_RESET,
        target_table="users",
        target_id=user.id,
        reason="Password reset from owner user management.",
    )

    return Response({"detail": "Password reset successfully."})


@api_view(["POST"])
@permission_classes([IsOwner])
def admin_deactivate_user(request, pk):
    user = get_object_or_404(User, pk=pk)
    if user.role == User.Role.OWNER:
        return Response(
            {"detail": "Owner accounts must be managed manually by system administrator."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.status == User.Status.DEACTIVATED:
        return Response({"detail": "User is already deactivated."}, status=status.HTTP_400_BAD_REQUEST)

    user.status = User.Status.DEACTIVATED
    user.deactivated_at = timezone.now()
    user.save(update_fields=["status", "deactivated_at"])

    create_audit_log(
        actor_user=request.user,
        action=AuditLog.ActionType.DEACTIVATE,
        target_table="users",
        target_id=user.id,
        reason="User deactivated from owner user management.",
    )

    return Response(AdminUserSerializer(user, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsOwner])
def admin_reactivate_user(request, pk):
    user = get_object_or_404(User, pk=pk)
    if user.role == User.Role.OWNER:
        return Response(
            {"detail": "Owner accounts must be managed manually by system administrator."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.status == User.Status.ACTIVE:
        return Response({"detail": "User is already active."}, status=status.HTTP_400_BAD_REQUEST)

    user.status = User.Status.ACTIVE
    user.deactivated_at = None
    user.save(update_fields=["status", "deactivated_at"])

    create_audit_log(
        actor_user=request.user,
        action=AuditLog.ActionType.UPDATE,
        target_table="users",
        target_id=user.id,
        reason="User reactivated from owner user management.",
    )

    return Response(AdminUserSerializer(user, context={"request": request}).data)
