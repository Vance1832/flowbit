from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model

from .consumers import user_group_name
from .models import Notification


def push_to_user(user_id, *, unread=None):
    """Fan a real-time event to a user's WebSocket connections (best-effort).

    Pass `unread` to update the badge instantly; leave it None for fan-outs
    where recomputing per recipient would be costly (the client refetches and
    recounts). No-ops if no channel layer is configured.
    """
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        user_group_name(user_id),
        {"type": "notify", "unread": unread},
    )


def create_notification(user, notification_type, title, message, reference_table=None, reference_id=None):
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        reference_table=reference_table,
        reference_id=reference_id,
    )
    unread = Notification.objects.filter(user=user, is_read=False).count()
    push_to_user(user.id, unread=unread)
    return notification


# Audience key -> roles that receive the broadcast.
BROADCAST_AUDIENCES = {
    "all": ["user", "staff", "admin", "owner"],
    "users": ["user"],
    "staff": ["staff"],
    "admins": ["admin", "owner"],
}


def broadcast_notification(actor, audience, title, message):
    """Fan out a SYSTEM notification to every active user in the audience.

    Returns the number of recipients. The sender is excluded.
    """
    roles = BROADCAST_AUDIENCES.get(audience)
    if not roles:
        raise ValueError("Invalid audience.")

    title = (title or "").strip()
    message = (message or "").strip()
    if not title or not message:
        raise ValueError("Title and message are required.")

    User = get_user_model()
    recipients = User.objects.filter(role__in=roles, status="active")
    if actor is not None:
        recipients = recipients.exclude(id=actor.id)

    notifications = [
        Notification(
            user=recipient,
            notification_type=Notification.NotificationType.SYSTEM,
            title=title,
            message=message,
        )
        for recipient in recipients
    ]
    Notification.objects.bulk_create(notifications)

    # bulk_create skips signals; nudge each recipient explicitly. unread=None
    # avoids a count query per recipient — the client refetches and recounts.
    for recipient in recipients:
        push_to_user(recipient.id)

    return len(notifications)