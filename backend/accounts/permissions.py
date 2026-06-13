from rest_framework import permissions
from .models import User


class RolePermission(permissions.BasePermission):
    allowed_roles = ()
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role in self.allowed_roles
        )


class IsStaffAdminOwner(RolePermission):
    allowed_roles = (
        User.Role.STAFF,
        User.Role.ADMIN,
        User.Role.OWNER,
    )
    message = "Only staff, admin, or owner users can access this endpoint."


class IsAdminOwner(RolePermission):
    allowed_roles = (
        User.Role.ADMIN,
        User.Role.OWNER,
    )
    message = "Only admin or owner users can access this endpoint."


class IsOwner(RolePermission):
    allowed_roles = (User.Role.OWNER,)
    message = "Only owner users can access this endpoint."
