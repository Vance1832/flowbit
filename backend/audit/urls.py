from django.urls import path

from .views import AdminAuditLogListView, admin_audit_logs_export


urlpatterns = [
    path("admin/logs/", AdminAuditLogListView.as_view(), name="admin-audit-logs"),
    path("admin/logs/export/", admin_audit_logs_export, name="admin-audit-logs-export"),
]
