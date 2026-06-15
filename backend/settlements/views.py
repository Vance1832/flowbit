from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from accounts.permissions import IsAdminOwner, IsOwner
from config.csv_utils import csv_response
from .models import SettlementBatch
from .serializers import SettlementBatchSerializer
from .services import approve_settlement, void_settlement


def _dt(value):
    return value.strftime("%Y-%m-%d %H:%M") if value else ""


@api_view(["GET"])
@permission_classes([IsAdminOwner])
def admin_settlements_export(request):
    batches = (
        SettlementBatch.objects.select_related("result_period")
        .all()
        .order_by("-created_at")
    )
    header = [
        "Period", "Result Number", "Collected", "Settlement", "Profit/Loss",
        "Reserve Required", "Reserve Used", "Status", "Previewed At", "Paid At",
    ]
    rows = (
        (
            batch.result_period.code,
            batch.result_number,
            batch.total_collected,
            batch.total_settlement,
            batch.final_profit_loss,
            batch.company_reserve_required,
            batch.company_reserve_used,
            batch.get_status_display(),
            _dt(batch.previewed_at),
            _dt(batch.paid_at),
        )
        for batch in batches
    )
    return csv_response("flowbit-settlements.csv", header, rows)


class AdminSettlementBatchListView(generics.ListAPIView):
    serializer_class = SettlementBatchSerializer
    permission_classes = [IsAdminOwner]

    def get_queryset(self):
        return SettlementBatch.objects.all().order_by("-created_at")


class AdminSettlementBatchDetailView(generics.RetrieveAPIView):
    serializer_class = SettlementBatchSerializer
    permission_classes = [IsAdminOwner]
    queryset = SettlementBatch.objects.all()


@api_view(["POST"])
@permission_classes([IsOwner])
def admin_approve_settlement(request, pk):
    batch = get_object_or_404(SettlementBatch, pk=pk)

    try:
        approved_batch = approve_settlement(batch=batch, admin_user=request.user)
    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(SettlementBatchSerializer(approved_batch).data)


@api_view(["POST"])
@permission_classes([IsOwner])
def admin_void_settlement(request, pk):
    batch = get_object_or_404(SettlementBatch, pk=pk)

    try:
        voided_batch = void_settlement(
            batch=batch,
            owner_user=request.user,
            reason=request.data.get("reason", ""),
        )
    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(SettlementBatchSerializer(voided_batch).data)
