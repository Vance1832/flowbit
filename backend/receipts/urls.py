from django.urls import path
from .views import MyReceiptListView, MyReceiptDetailView, SubmitReceiptView


urlpatterns = [
    path("", MyReceiptListView.as_view(), name="my-receipts"),
    path("submit/", SubmitReceiptView.as_view(), name="submit-receipt"),
    path("<int:pk>/", MyReceiptDetailView.as_view(), name="receipt-detail"),
]