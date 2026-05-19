from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOwner
from .models import ResultPeriod, Ledger, LedgerNumber
from .serializers import (
    UserVisibleResultSerializer,
    ResultPeriodSerializer,
    LedgerSerializer,
    LedgerNumberSerializer,
    EnterResultSerializer,
)
from .services import (
    get_user_visible_results,
    close_result_period,
    enter_result_and_preview_settlement,
)


class UserResultListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        results = get_user_visible_results(request.user)
        return Response(results)


class AdminResultPeriodListCreateView(generics.ListCreateAPIView):
    serializer_class = ResultPeriodSerializer
    permission_classes = [IsAdminOwner]

    def get_queryset(self):
        return ResultPeriod.objects.all().order_by("-result_date")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminResultPeriodDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ResultPeriodSerializer
    permission_classes = [IsAdminOwner]
    queryset = ResultPeriod.objects.all()


class AdminLedgerListCreateView(generics.ListCreateAPIView):
    serializer_class = LedgerSerializer
    permission_classes = [IsAdminOwner]

    def get_queryset(self):
        return Ledger.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminLedgerDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = LedgerSerializer
    permission_classes = [IsAdminOwner]
    queryset = Ledger.objects.all()


class AdminLedgerNumberListView(generics.ListAPIView):
    serializer_class = LedgerNumberSerializer
    permission_classes = [IsAdminOwner]

    def get_queryset(self):
        ledger_id = self.kwargs["ledger_id"]
        return LedgerNumber.objects.filter(ledger_id=ledger_id).order_by("number_code")


@api_view(["POST"])
@permission_classes([IsAdminOwner])
def admin_close_result_period(request, pk):
    result_period = ResultPeriod.objects.get(pk=pk)
    result_period = close_result_period(result_period, request.user)
    return Response(ResultPeriodSerializer(result_period).data)


@api_view(["POST"])
@permission_classes([IsAdminOwner])
def admin_enter_result(request, pk):
    result_period = ResultPeriod.objects.get(pk=pk)

    serializer = EnterResultSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        batch = enter_result_and_preview_settlement(
            result_period=result_period,
            result_number=serializer.validated_data["result_number"],
            admin_user=request.user,
        )
    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Result entered and settlement preview created.",
            "settlement_batch_id": batch.id,
            "result_period": batch.result_period.code,
            "result_number": batch.result_number,
            "status": batch.status,
            "total_collected": batch.total_collected,
            "total_settlement": batch.total_settlement,
            "reserve_required": batch.company_reserve_required,
            "profit_loss": batch.final_profit_loss,
        }
    )