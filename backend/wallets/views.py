from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from accounts.permissions import IsAdminOwner, IsStaffAdminOwner
from audit.models import AuditLog
from audit.services import create_audit_log
from config.csv_utils import csv_response
from .services import (
    assign_deposit_request,
    approve_deposit_request,
    reject_deposit_request,
    approve_withdrawal_request,
    reject_withdrawal_request,
    mark_withdrawal_paid,
)

from rest_framework import generics, permissions, serializers
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from compliance.services import assert_can_deposit, assert_can_withdraw

from .idempotency import IdempotentCreateMixin

from .models import (
    SystemSetting,
    UserWallet,
    WalletTransaction,
    DepositRequest,
    WithdrawalRequest,
)
from .serializers import (
    SystemSettingSerializer,
    UserWalletSerializer,
    WalletTransactionSerializer,
    DepositRequestSerializer,
    WithdrawalRequestSerializer,
)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def system_status(request):
    """Public maintenance status, polled by the web app to show a global banner."""
    from .services import get_setting

    maintenance = (get_setting("maintenance_mode", "false") or "false").lower() == "true"
    return Response(
        {
            "maintenance_mode": maintenance,
            "maintenance_message": get_setting("maintenance_message", "") or "",
        }
    )


class AdminSystemSettingListView(generics.ListAPIView):
    """List configurable system settings (admin/owner only)."""

    serializer_class = SystemSettingSerializer
    permission_classes = [IsAdminOwner]
    queryset = SystemSetting.objects.all().order_by("setting_key")


class AdminSystemSettingUpdateView(generics.UpdateAPIView):
    """Update a single system setting value, recording an audit log entry."""

    serializer_class = SystemSettingSerializer
    permission_classes = [IsAdminOwner]
    queryset = SystemSetting.objects.all()
    http_method_names = ["patch", "put", "options", "head"]

    def perform_update(self, serializer):
        old_value = serializer.instance.setting_value
        setting = serializer.save(updated_by=self.request.user)
        create_audit_log(
            actor_user=self.request.user,
            action=AuditLog.ActionType.UPDATE,
            target_table="system_settings",
            target_id=setting.id,
            old_values={"setting_value": old_value},
            new_values={"setting_value": setting.setting_value},
            reason=f"System setting '{setting.setting_key}' updated.",
        )


class MyWalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet, _ = UserWallet.objects.get_or_create(user=request.user)
        serializer = UserWalletSerializer(wallet)
        return Response(serializer.data)


class MyWalletTransactionListView(generics.ListAPIView):
    serializer_class = WalletTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WalletTransaction.objects.filter(user=self.request.user).order_by("-created_at")


class DepositRequestListCreateView(IdempotentCreateMixin, generics.ListCreateAPIView):
    serializer_class = DepositRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return DepositRequest.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        wallet, _ = UserWallet.objects.get_or_create(user=self.request.user)
        try:
            assert_can_deposit(self.request.user, serializer.validated_data["amount"])
        except ValueError as error:
            raise serializers.ValidationError({"detail": str(error)})
        serializer.save(user=self.request.user, wallet=wallet)


class WithdrawalRequestListCreateView(IdempotentCreateMixin, generics.ListCreateAPIView):
    serializer_class = WithdrawalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WithdrawalRequest.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        wallet, _ = UserWallet.objects.get_or_create(user=self.request.user)
        try:
            assert_can_withdraw(self.request.user, serializer.validated_data["amount"])
        except ValueError as error:
            raise serializers.ValidationError({"detail": str(error)})
        serializer.save(user=self.request.user, wallet=wallet)

class AdminDepositRequestListView(generics.ListAPIView):
    serializer_class = DepositRequestSerializer
    permission_classes = [IsStaffAdminOwner]

    def get_queryset(self):
        return DepositRequest.objects.all().order_by("-created_at")


@api_view(["POST"])
@permission_classes([IsStaffAdminOwner])
def admin_assign_deposit(request, pk):
    deposit = get_object_or_404(DepositRequest, pk=pk)
    try:
        deposit = assign_deposit_request(deposit, request.user)
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    serializer = DepositRequestSerializer(deposit, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsStaffAdminOwner])
def admin_approve_deposit(request, pk):
    deposit = get_object_or_404(DepositRequest, pk=pk)
    staff_note = request.data.get("staff_note")
    try:
        deposit, wallet_tx = approve_deposit_request(deposit, request.user, staff_note)
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    serializer = DepositRequestSerializer(deposit, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsStaffAdminOwner])
def admin_reject_deposit(request, pk):
    deposit = get_object_or_404(DepositRequest, pk=pk)
    staff_note = request.data.get("staff_note")
    try:
        deposit = reject_deposit_request(deposit, request.user, staff_note)
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    serializer = DepositRequestSerializer(deposit, context={"request": request})
    return Response(serializer.data)


class AdminWithdrawalRequestListView(generics.ListAPIView):
    serializer_class = WithdrawalRequestSerializer
    permission_classes = [IsStaffAdminOwner]

    def get_queryset(self):
        return WithdrawalRequest.objects.all().order_by("-created_at")


def _dt(value):
    return value.strftime("%Y-%m-%d %H:%M") if value else ""


@api_view(["GET"])
@permission_classes([IsStaffAdminOwner])
def admin_deposits_export(request):
    deposits = (
        DepositRequest.objects.select_related("user", "assigned_to", "reviewed_by")
        .all()
        .order_by("-created_at")
    )
    header = [
        "Created", "User", "Phone", "Amount", "Payment Method",
        "Status", "Assigned To", "Reviewed By", "Reviewed At",
    ]
    rows = (
        (
            _dt(d.created_at),
            d.user.name,
            d.user.phone,
            d.amount,
            d.payment_method or "",
            d.get_status_display(),
            d.assigned_to.name if d.assigned_to else "",
            d.reviewed_by.name if d.reviewed_by else "",
            _dt(d.reviewed_at),
        )
        for d in deposits
    )
    return csv_response("flowbit-deposit-requests.csv", header, rows)


@api_view(["GET"])
@permission_classes([IsStaffAdminOwner])
def admin_withdrawals_export(request):
    withdrawals = (
        WithdrawalRequest.objects.select_related("user", "reviewed_by", "paid_by")
        .all()
        .order_by("-created_at")
    )
    header = [
        "Created", "User", "Phone", "Amount", "Payment Method",
        "Status", "Reviewed By", "Paid By", "Paid At",
    ]
    rows = (
        (
            _dt(w.created_at),
            w.user.name,
            w.user.phone,
            w.amount,
            w.payment_method or "",
            w.get_status_display(),
            w.reviewed_by.name if w.reviewed_by else "",
            w.paid_by.name if w.paid_by else "",
            _dt(w.paid_at),
        )
        for w in withdrawals
    )
    return csv_response("flowbit-withdrawal-requests.csv", header, rows)


@api_view(["POST"])
@permission_classes([IsStaffAdminOwner])
def admin_approve_withdrawal(request, pk):
    withdrawal = get_object_or_404(WithdrawalRequest, pk=pk)
    staff_note = request.data.get("staff_note")
    try:
        withdrawal = approve_withdrawal_request(withdrawal, request.user, staff_note)
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    serializer = WithdrawalRequestSerializer(withdrawal)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsStaffAdminOwner])
def admin_reject_withdrawal(request, pk):
    withdrawal = get_object_or_404(WithdrawalRequest, pk=pk)
    staff_note = request.data.get("staff_note")
    try:
        withdrawal = reject_withdrawal_request(withdrawal, request.user, staff_note)
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    serializer = WithdrawalRequestSerializer(withdrawal)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsStaffAdminOwner])
def admin_mark_withdrawal_paid(request, pk):
    withdrawal = get_object_or_404(WithdrawalRequest, pk=pk)
    staff_note = request.data.get("staff_note")
    try:
        withdrawal, wallet_tx = mark_withdrawal_paid(withdrawal, request.user, staff_note)
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    serializer = WithdrawalRequestSerializer(withdrawal)
    return Response(serializer.data)
