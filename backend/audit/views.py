from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes

from accounts.permissions import IsAdminOwner
from config.csv_utils import csv_response

from .models import AuditLog
from .serializers import AuditLogSerializer, _friendly_target


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


@api_view(["GET"])
@permission_classes([IsAdminOwner])
def admin_audit_logs_export(request):
    logs = AuditLog.objects.select_related("actor_user").order_by("-created_at")[:1000]
    header = ["Time", "Actor", "Role", "Action", "Target", "Target ID", "Reason", "IP"]
    rows = (
        (
            log.created_at.strftime("%Y-%m-%d %H:%M"),
            log.actor_user.name if log.actor_user else "System",
            (log.actor_user.role.replace("_", " ").title() if log.actor_user else "System"),
            (log.action or "").upper(),
            _friendly_target(log.target_table),
            log.target_id or "",
            log.reason or "",
            log.ip_address or "",
        )
        for log in logs
    )
    return csv_response("flowbit-audit-logs.csv", header, rows)
