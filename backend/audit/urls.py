from django.urls import path

from .views import (
    AdminAuditLogListView,
    admin_audit_logs_export,
    admin_audit_verify,
)


urlpatterns = [
    path("admin/logs/", AdminAuditLogListView.as_view(), name="admin-audit-logs"),
    path("admin/logs/export/", admin_audit_logs_export, name="admin-audit-logs-export"),
    path("admin/logs/verify/", admin_audit_verify, name="admin-audit-logs-verify"),
]
