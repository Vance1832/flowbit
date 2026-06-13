from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from accounts.permissions import IsAdminOwner, IsOwner
from .models import SettlementBatch
from .serializers import SettlementBatchSerializer
from .services import approve_settlement


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
