from django.urls import path
from .views import (
    MyNotificationListView,
    admin_broadcast_audiences,
    admin_broadcast_notification,
    mark_notification_read,
    mark_all_notifications_read,
)


urlpatterns = [
    path("", MyNotificationListView.as_view(), name="my-notifications"),
    path("admin/broadcast/", admin_broadcast_notification, name="admin-broadcast"),
    path("admin/broadcast/audiences/", admin_broadcast_audiences, name="admin-broadcast-audiences"),
    path("<int:pk>/read/", mark_notification_read, name="mark-notification-read"),
    path("read-all/", mark_all_notifications_read, name="mark-all-notifications-read"),
]