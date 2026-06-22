from django.urls import path

from .views import (
    AdminKycListView,
    KycSubmissionListCreateView,
    ResponsibleGamblingView,
    admin_review_kyc,
)

urlpatterns = [
    path("responsible-gambling/", ResponsibleGamblingView.as_view(), name="responsible-gambling"),
    path("kyc/", KycSubmissionListCreateView.as_view(), name="kyc-list-create"),
    path("admin/kyc/", AdminKycListView.as_view(), name="admin-kyc-list"),
    path("admin/kyc/<int:pk>/review/", admin_review_kyc, name="admin-kyc-review"),
]
