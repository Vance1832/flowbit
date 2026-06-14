from django.urls import path
from .views import (
    MyReceiptListView,
    MyReceiptDetailView,
    MyReceiptPdfView,
    SubmitReceiptView,
)


urlpatterns = [
    path("", MyReceiptListView.as_view(), name="my-receipts"),
    path("submit/", SubmitReceiptView.as_view(), name="submit-receipt"),
    path("<int:pk>/", MyReceiptDetailView.as_view(), name="receipt-detail"),
    path("<int:pk>/pdf/", MyReceiptPdfView.as_view(), name="receipt-pdf"),
]