from django.urls import path
from .views import (
    MyWalletView,
    MyWalletTransactionListView,
    DepositRequestListCreateView,
    WithdrawalRequestListCreateView,
    AdminDepositRequestListView,
    admin_assign_deposit,
    admin_approve_deposit,
    admin_reject_deposit,
    AdminWithdrawalRequestListView,
    admin_approve_withdrawal,
    admin_reject_withdrawal,
    admin_mark_withdrawal_paid,
    AdminSystemSettingListView,
    AdminSystemSettingUpdateView,
    admin_deposits_export,
    admin_withdrawals_export,
)


urlpatterns = [
    path("me/", MyWalletView.as_view(), name="my-wallet"),
    path("transactions/", MyWalletTransactionListView.as_view(), name="wallet-transactions"),
    path("deposits/", DepositRequestListCreateView.as_view(), name="deposit-requests"),
    path("withdrawals/", WithdrawalRequestListCreateView.as_view(), name="withdrawal-requests"),

    path("admin/deposits/export/", admin_deposits_export, name="admin-deposits-export"),
    path("admin/withdrawals/export/", admin_withdrawals_export, name="admin-withdrawals-export"),
    path("admin/deposits/", AdminDepositRequestListView.as_view(), name="admin-deposit-list"),
    path("admin/deposits/<int:pk>/assign/", admin_assign_deposit, name="admin-assign-deposit"),
    path("admin/deposits/<int:pk>/approve/", admin_approve_deposit, name="admin-approve-deposit"),
    path("admin/deposits/<int:pk>/reject/", admin_reject_deposit, name="admin-reject-deposit"),

    path("admin/withdrawals/", AdminWithdrawalRequestListView.as_view(), name="admin-withdrawal-list"),
    path("admin/withdrawals/<int:pk>/approve/", admin_approve_withdrawal, name="admin-approve-withdrawal"),
    path("admin/withdrawals/<int:pk>/reject/", admin_reject_withdrawal, name="admin-reject-withdrawal"),
    path("admin/withdrawals/<int:pk>/mark-paid/", admin_mark_withdrawal_paid, name="admin-mark-withdrawal-paid"),

    path("admin/settings/", AdminSystemSettingListView.as_view(), name="admin-system-settings"),
    path("admin/settings/<int:pk>/", AdminSystemSettingUpdateView.as_view(), name="admin-system-setting-update"),
]