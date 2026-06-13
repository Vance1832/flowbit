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