from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from accounts.permissions import IsStaffAdminOwner
from .services import (
    assign_deposit_request,
    approve_deposit_request,
    reject_deposit_request,
    approve_withdrawal_request,
    reject_withdrawal_request,
    mark_withdrawal_paid,
)

from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    UserWallet,
    WalletTransaction,
    DepositRequest,
    WithdrawalRequest,
)
from .serializers import (
    UserWalletSerializer,
    WalletTransactionSerializer,
    DepositRequestSerializer,
    WithdrawalRequestSerializer,
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


class DepositRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = DepositRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DepositRequest.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        wallet, _ = UserWallet.objects.get_or_create(user=self.request.user)
        serializer.save(user=self.request.user, wallet=wallet)


class WithdrawalRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = WithdrawalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WithdrawalRequest.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        wallet, _ = UserWallet.objects.get_or_create(user=self.request.user)
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
    serializer = DepositRequestSerializer(deposit)
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
    serializer = DepositRequestSerializer(deposit)
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
    serializer = DepositRequestSerializer(deposit)
    return Response(serializer.data)


class AdminWithdrawalRequestListView(generics.ListAPIView):
    serializer_class = WithdrawalRequestSerializer
    permission_classes = [IsStaffAdminOwner]

    def get_queryset(self):
        return WithdrawalRequest.objects.all().order_by("-created_at")


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
