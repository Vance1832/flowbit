from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User

    list_display = (
        "id",
        "name",
        "phone_country_code",
        "phone_number",
        "email",
        "role",
        "status",
        "is_staff",
        "is_superuser",
    )

    list_filter = ("role", "status", "is_staff", "is_superuser")
    search_fields = ("name", "phone", "phone_number", "email")
    ordering = ("id",)

    fieldsets = (
        (None, {"fields": ("phone", "password")}),
        ("Phone Info", {"fields": ("phone_country_code", "phone_number")}),
        ("Personal Info", {"fields": ("name", "email")}),
        ("Role & Status", {"fields": ("role", "status")}),
        ("Verification", {"fields": ("phone_verified", "email_verified")}),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important Dates", {"fields": ("last_login", "date_joined", "deactivated_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "phone_country_code",
                    "phone_number",
                    "name",
                    "email",
                    "role",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )

    readonly_fields = ("phone",)