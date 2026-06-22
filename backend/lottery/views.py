from rest_framework import generics, permissions
from rest_framework.pagination import PageNumberPagination

from .models import LotteryDraw
from .serializers import LotteryDrawSerializer


class LotteryDrawPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"
    max_page_size = 100


class LotteryDrawListView(generics.ListAPIView):
    """Official Thai 3D draw history (newest first), for signed-in users."""

    serializer_class = LotteryDrawSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LotteryDrawPagination
    queryset = LotteryDraw.objects.all()  # ordered by -draw_date via model Meta
