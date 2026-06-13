from rest_framework_simplejwt.views import TokenRefreshView

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import CustomTokenObtainPairView


urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/accounts/", include("accounts.urls")),
    path("api/wallets/", include("wallets.urls")),
    path("api/receipts/", include("receipts.urls")),
    path("api/ledgers/", include("ledgers.urls")),
    path("api/settlements/", include("settlements.urls")),

    path("api/auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/company/", include("company.urls")),
    path("api/notifications/", include("notifications.urls")),
]