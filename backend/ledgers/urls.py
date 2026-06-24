from django.urls import path
from .views import (
    UserCurrentResultPeriodView,
    UserResultOverviewView,
    UserResultListView,
    AdminResultPeriodListCreateView,
    AdminResultPeriodDetailView,
    AdminLedgerListCreateView,
    AdminLedgerDetailView,
    AdminLedgerNumberListView,
    AdminLedgerTemplateListCreateView,
    AdminLedgerTemplateDetailView,
    admin_build_ledgers,
    admin_close_result_period,
    admin_enter_result,
    admin_official_result,
)


urlpatterns = [
    path("current-period/", UserCurrentResultPeriodView.as_view(), name="user-current-result-period"),
    path("results-overview/", UserResultOverviewView.as_view(), name="user-results-overview"),
    path("results/", UserResultListView.as_view(), name="user-results"),

    path("admin/result-periods/", AdminResultPeriodListCreateView.as_view(), name="admin-result-periods"),
    path("admin/result-periods/<int:pk>/", AdminResultPeriodDetailView.as_view(), name="admin-result-period-detail"),
    path("admin/result-periods/<int:pk>/close/", admin_close_result_period, name="admin-close-result-period"),
    path("admin/result-periods/<int:pk>/official-result/", admin_official_result, name="admin-official-result"),
    path("admin/result-periods/<int:pk>/enter-result/", admin_enter_result, name="admin-enter-result"),
    path("admin/result-periods/<int:pk>/build-ledgers/", admin_build_ledgers, name="admin-build-ledgers"),

    path("admin/ledger-templates/", AdminLedgerTemplateListCreateView.as_view(), name="admin-ledger-templates"),
    path("admin/ledger-templates/<int:pk>/", AdminLedgerTemplateDetailView.as_view(), name="admin-ledger-template-detail"),

    path("admin/ledgers/", AdminLedgerListCreateView.as_view(), name="admin-ledgers"),
    path("admin/ledgers/<int:pk>/", AdminLedgerDetailView.as_view(), name="admin-ledger-detail"),
    path("admin/ledgers/<int:ledger_id>/numbers/", AdminLedgerNumberListView.as_view(), name="admin-ledger-numbers"),
]
