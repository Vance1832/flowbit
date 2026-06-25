from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from accounts.permissions import IsAdminOwner
from audit.models import AuditLog
from audit.services import create_audit_log
from .models import Notification
from .serializers import NotificationSerializer
from .services import BROADCAST_AUDIENCES, broadcast_notification


class MyNotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_unread_count(request):
    """Lightweight unread tally for polling — count only, no serialization."""
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({"unread": count})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_notification_read(request, pk):
    notification = get_object_or_404(Notification, pk=pk, user=request.user)
    notification.is_read = True
    notification.read_at = timezone.now()
    notification.save(update_fields=["is_read", "read_at"])
    return Response(NotificationSerializer(notification).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_all_notifications_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(
        is_read=True,
        read_at=timezone.now(),
    )
    return Response({"detail": "All notifications marked as read."})


@api_view(["POST"])
@permission_classes([IsAdminOwner])
def admin_broadcast_notification(request):
    audience = request.data.get("audience", "all")

    try:
        count = broadcast_notification(
            actor=request.user,
            audience=audience,
            title=request.data.get("title", ""),
            message=request.data.get("message", ""),
        )
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)

    create_audit_log(
        actor_user=request.user,
        action=AuditLog.ActionType.CREATE,
        target_table="notifications",
        reason=f"Broadcast announcement to '{audience}' ({count} recipients).",
        new_values={"audience": audience, "recipients": count},
    )

    return Response(
        {"detail": f"Announcement sent to {count} recipients.", "recipients": count},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAdminOwner])
def admin_broadcast_audiences(request):
    """Audience options with the current active-recipient count for each."""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    labels = {
        "all": "Everyone",
        "users": "All users",
        "staff": "All staff",
        "admins": "Admins & owners",
    }
    options = []
    for key, roles in BROADCAST_AUDIENCES.items():
        count = User.objects.filter(role__in=roles, status="active").count()
        options.append({"value": key, "label": labels.get(key, key), "count": count})
    return Response({"audiences": options})
