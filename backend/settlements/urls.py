from django.urls import path
from .views import (
    AdminSettlementBatchListView,
    AdminSettlementBatchDetailView,
    admin_approve_settlement,
    admin_void_settlement,
)


urlpatterns = [
    path("admin/batches/", AdminSettlementBatchListView.as_view(), name="admin-settlement-batches"),
    path("admin/batches/<int:pk>/", AdminSettlementBatchDetailView.as_view(), name="admin-settlement-batch-detail"),
    path("admin/batches/<int:pk>/approve/", admin_approve_settlement, name="admin-approve-settlement"),
    path("admin/batches/<int:pk>/void/", admin_void_settlement, name="admin-void-settlement"),
]