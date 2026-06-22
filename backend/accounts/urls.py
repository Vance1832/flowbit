from django.urls import path

from .views import (
    AdminUserDetailView,
    AdminUserListCreateView,
    AvatarUploadView,
    EmailVerificationConfirmView,
    EmailVerificationRequestView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PhoneVerificationConfirmView,
    PhoneVerificationRequestView,
    RegisterView,
    admin_deactivate_user,
    admin_reactivate_user,
    admin_reset_user_password,
    change_password,
)


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("me/avatar/", AvatarUploadView.as_view(), name="me-avatar"),
    path("change-password/", change_password, name="change-password"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("phone-verification/request/", PhoneVerificationRequestView.as_view(), name="phone-verification-request"),
    path("phone-verification/confirm/", PhoneVerificationConfirmView.as_view(), name="phone-verification-confirm"),
    path("email-verification/request/", EmailVerificationRequestView.as_view(), name="email-verification-request"),
    path("email-verification/confirm/", EmailVerificationConfirmView.as_view(), name="email-verification-confirm"),
    path("admin/users/", AdminUserListCreateView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path(
        "admin/users/<int:pk>/reset-password/",
        admin_reset_user_password,
        name="admin-user-reset-password",
    ),
    path(
        "admin/users/<int:pk>/deactivate/",
        admin_deactivate_user,
        name="admin-user-deactivate",
    ),
    path(
        "admin/users/<int:pk>/reactivate/",
        admin_reactivate_user,
        name="admin-user-reactivate",
    ),
]
