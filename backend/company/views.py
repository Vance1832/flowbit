from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from accounts.permissions import IsAdminOwner, IsOwner
from config.csv_utils import csv_response
from settlements.models import SettlementBatch
from wallets.models import DepositRequest, WithdrawalRequest
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
    wallet = get_object_or_404(CompanyWallet, pk=pk)

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
        if wallet is None:
            raise serializers.ValidationError(
                {"detail": "Company wallet does not exist."}
            )
        serializer.save(company_wallet=wallet, requested_by=self.request.user)


@api_view(["POST"])
@permission_classes([IsOwner])
def owner_approve_company_cashout(request, pk):
    cashout = get_object_or_404(CompanyCashoutRequest, pk=pk)

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
    cashout = get_object_or_404(CompanyCashoutRequest, pk=pk)

    try:
        cashout = mark_company_cashout_paid(
            cashout=cashout,
            owner_user=request.user,
            note=request.data.get("admin_note"),
        )
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(CompanyCashoutRequestSerializer(cashout).data)


@api_view(["GET"])
@permission_classes([IsAdminOwner])
def admin_analytics(request):
    """Aggregated financial analytics for the operations dashboard."""
    active_batches = SettlementBatch.objects.exclude(
        status=SettlementBatch.Status.VOIDED
    )

    totals = active_batches.aggregate(
        collected=Sum("total_collected"),
        settlement=Sum("total_settlement"),
        profit_loss=Sum("final_profit_loss"),
    )
    reserve = CompanyWallet.objects.first()

    summary = {
        "total_collected": str(totals["collected"] or Decimal("0")),
        "total_settlement": str(totals["settlement"] or Decimal("0")),
        "net_profit_loss": str(totals["profit_loss"] or Decimal("0")),
        "reserve_balance": str(reserve.balance if reserve else Decimal("0")),
    }

    # Per-period: collected vs settlement (oldest -> newest of the recent set)
    recent = list(
        active_batches.select_related("result_period").order_by("-created_at")[:8]
    )
    period_performance = [
        {
            "code": batch.result_period.code,
            "collected": str(batch.total_collected),
            "settlement": str(batch.total_settlement),
            "profit_loss": str(batch.final_profit_loss),
        }
        for batch in reversed(recent)
    ]

    # Cashflow: approved deposits vs paid withdrawals over the last 14 days
    today = timezone.now().date()
    start = today - timedelta(days=13)

    def _by_day(queryset):
        rows = (
            queryset.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Sum("amount"))
        )
        return {row["day"]: row["total"] or Decimal("0") for row in rows}

    deposits_by_day = _by_day(
        DepositRequest.objects.filter(
            status=DepositRequest.Status.APPROVED, created_at__date__gte=start
        )
    )
    withdrawals_by_day = _by_day(
        WithdrawalRequest.objects.filter(
            status=WithdrawalRequest.Status.PAID, created_at__date__gte=start
        )
    )

    cashflow = []
    for offset in range(14):
        day = start + timedelta(days=offset)
        cashflow.append(
            {
                "date": day.isoformat(),
                "deposits": str(deposits_by_day.get(day, Decimal("0"))),
                "withdrawals": str(withdrawals_by_day.get(day, Decimal("0"))),
            }
        )

    return Response(
        {
            "summary": summary,
            "period_performance": period_performance,
            "cashflow": cashflow,
        }
    )


@api_view(["GET"])
@permission_classes([IsAdminOwner])
def admin_reserve_transactions_export(request):
    transactions = (
        CompanyWalletTransaction.objects.select_related("created_by")
        .all()
        .order_by("-created_at")
    )
    header = [
        "Date", "Type", "Amount", "Balance Before", "Balance After",
        "Description", "Created By",
    ]
    rows = (
        (
            tx.created_at.strftime("%Y-%m-%d %H:%M"),
            tx.get_transaction_type_display(),
            tx.amount,
            tx.balance_before,
            tx.balance_after,
            tx.description or "",
            tx.created_by.name if tx.created_by else "",
        )
        for tx in transactions
    )
    return csv_response("flowbit-company-reserve.csv", header, rows)
