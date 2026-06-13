from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ledgers.models import ResultPeriod
from .models import Receipt
from .serializers import ReceiptSerializer, SubmitReceiptSerializer
from .services import create_paid_receipt


class MyReceiptListView(generics.ListAPIView):
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Receipt.objects.filter(user=self.request.user).order_by("-created_at")


class MyReceiptDetailView(generics.RetrieveAPIView):
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Receipt.objects.filter(user=self.request.user)


class SubmitReceiptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SubmitReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result_period_code = serializer.validated_data["result_period_code"]
        items = serializer.validated_data["items"]

        try:
            result_period = ResultPeriod.objects.get(code=result_period_code)
            receipt = create_paid_receipt(
                user=request.user,
                result_period=result_period,
                raw_items=items,
            )
        except ResultPeriod.DoesNotExist:
            return Response(
                {"detail": "Result period not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            ReceiptSerializer(receipt).data,
            status=status.HTTP_201_CREATED,
        )