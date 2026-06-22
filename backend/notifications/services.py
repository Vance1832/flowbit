from django.contrib.auth import get_user_model

from .models import Notification


def create_notification(user, notification_type, title, message, reference_table=None, reference_id=None):
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        reference_table=reference_table,
        reference_id=reference_id,
    )


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
    return len(notifications)