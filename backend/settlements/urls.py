from django.urls import path
from .views import (
    AdminSettlementBatchListView,
    AdminSettlementBatchDetailView,
    admin_approve_settlement,
)


urlpatterns = [
    path("admin/batches/", AdminSettlementBatchListView.as_view(), name="admin-settlement-batches"),
    path("admin/batches/<int:pk>/", AdminSettlementBatchDetailView.as_view(), name="admin-settlement-batch-detail"),
    path("admin/batches/<int:pk>/approve/", admin_approve_settlement, name="admin-approve-settlement"),
]