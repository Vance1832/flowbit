from rest_framework import generics

from accounts.permissions import IsAdminOwner

from .models import AuditLog
from .serializers import AuditLogSerializer


class AdminAuditLogListView(generics.ListAPIView):
    """Most recent audit log entries for owners and admins."""

    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOwner]
    pagination_class = None

    def get_queryset(self):
        return (
            AuditLog.objects.select_related("actor_user")
            .order_by("-created_at")[:200]
        )
