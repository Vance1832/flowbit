from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsAdminOwner, IsOwner
from .models import CompanyWallet, CompanyWalletTransaction, CompanyCashoutRequest
from .serializers import (
    CompanyWalletSerializer,
    CompanyWalletTransactionSerializer,
    CompanyCashoutRequestSerializer,
    ReserveDepositSerializer,
)
from .services import add_company_reserve, approve_company_cashout, mark_company_cashout_paid


class CompanyWalletListView(generics.ListAPIView):
    serializer_class = CompanyWalletSerializer
    permission_classes = [IsAdminOwner]

    def get_queryset(self):
        return CompanyWallet.objects.all()


class CompanyWalletTransactionListView(generics.ListAPIView):
    serializer_class = CompanyWalletTransactionSerializer
    permission_classes = [IsAdminOwner]

    def get_queryset(self):
        return CompanyWalletTransaction.objects.all().order_by("-created_at")


@api_view(["POST"])
@permission_classes([IsAdminOwner])
def admin_add_company_reserve(request, pk):
    wallet = CompanyWallet.objects.get(pk=pk)

    serializer = ReserveDepositSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    wallet, tx = add_company_reserve(
        wallet=wallet,
        amount=serializer.validated_data["amount"],
        admin_user=request.user,
        description=serializer.validated_data.get("description"),
    )

    return Response(CompanyWalletSerializer(wallet).data)


class CompanyCashoutRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = CompanyCashoutRequestSerializer
    permission_classes = [IsAdminOwner]

    def get_queryset(self):
        return CompanyCashoutRequest.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        wallet = CompanyWallet.objects.first()
        serializer.save(company_wallet=wallet, requested_by=self.request.user)


@api_view(["POST"])
@permission_classes([IsOwner])
def owner_approve_company_cashout(request, pk):
    cashout = CompanyCashoutRequest.objects.get(pk=pk)

    try:
        cashout = approve_company_cashout(
            cashout=cashout,
            owner_user=request.user,
            note=request.data.get("admin_note"),
        )
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(CompanyCashoutRequestSerializer(cashout).data)


@api_view(["POST"])
@permission_classes([IsOwner])
def owner_mark_company_cashout_paid(request, pk):
    cashout = CompanyCashoutRequest.objects.get(pk=pk)

    try:
        cashout = mark_company_cashout_paid(
            cashout=cashout,
            owner_user=request.user,
            note=request.data.get("admin_note"),
        )
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(CompanyCashoutRequestSerializer(cashout).data)