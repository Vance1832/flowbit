from django.urls import path
from .views import (
    UserResultListView,
    AdminResultPeriodListCreateView,
    AdminResultPeriodDetailView,
    AdminLedgerListCreateView,
    AdminLedgerDetailView,
    AdminLedgerNumberListView,
    admin_close_result_period,
    admin_enter_result,
)


urlpatterns = [
    path("results/", UserResultListView.as_view(), name="user-results"),

    path("admin/result-periods/", AdminResultPeriodListCreateView.as_view(), name="admin-result-periods"),
    path("admin/result-periods/<int:pk>/", AdminResultPeriodDetailView.as_view(), name="admin-result-period-detail"),
    path("admin/result-periods/<int:pk>/close/", admin_close_result_period, name="admin-close-result-period"),
    path("admin/result-periods/<int:pk>/enter-result/", admin_enter_result, name="admin-enter-result"),

    path("admin/ledgers/", AdminLedgerListCreateView.as_view(), name="admin-ledgers"),
    path("admin/ledgers/<int:pk>/", AdminLedgerDetailView.as_view(), name="admin-ledger-detail"),
    path("admin/ledgers/<int:ledger_id>/numbers/", AdminLedgerNumberListView.as_view(), name="admin-ledger-numbers"),
]