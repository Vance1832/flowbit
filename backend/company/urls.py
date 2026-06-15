from django.urls import path
from .views import (
    CompanyWalletListView,
    CompanyWalletTransactionListView,
    admin_add_company_reserve,
    admin_analytics,
    CompanyCashoutRequestListCreateView,
    owner_approve_company_cashout,
    owner_mark_company_cashout_paid,
)


urlpatterns = [
    path("admin/wallets/", CompanyWalletListView.as_view(), name="company-wallets"),
    path("admin/wallets/<int:pk>/add-reserve/", admin_add_company_reserve, name="add-company-reserve"),
    path("admin/transactions/", CompanyWalletTransactionListView.as_view(), name="company-transactions"),
    path("admin/analytics/", admin_analytics, name="company-analytics"),

    path("admin/cashouts/", CompanyCashoutRequestListCreateView.as_view(), name="company-cashouts"),
    path("admin/cashouts/<int:pk>/approve/", owner_approve_company_cashout, name="approve-company-cashout"),
    path("admin/cashouts/<int:pk>/mark-paid/", owner_mark_company_cashout_paid, name="pay-company-cashout"),
]