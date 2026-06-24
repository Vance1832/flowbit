from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from accounts.permissions import IsAdminOwner
from config.csv_utils import csv_response

from .models import AuditLog
from .serializers import AuditLogSerializer, _friendly_target
from .services import verify_audit_chain


class AuditLogPagination(PageNumberPagination):
    """Keep responses bounded as the audit table grows without limit.

    A client can page through the full history via ``?page=`` and tune the
    window with ``?page_size=`` (capped at ``max_page_size``).
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class AdminAuditLogListView(generics.ListAPIView):
    """Paginated audit log entries for owners and admins (newest first)."""

    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOwner]
    pagination_class = AuditLogPagination

    def get_queryset(self):
        return AuditLog.objects.select_related("actor_user").order_by("-created_at")


@api_view(["GET"])
@permission_classes([IsAdminOwner])
def admin_audit_verify(request):
    """Verify the tamper-evident hash chain over the whole audit log."""
    return Response(verify_audit_chain())


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
