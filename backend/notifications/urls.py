from django.urls import path
from .views import (
    MyNotificationListView,
    mark_notification_read,
    mark_all_notifications_read,
)


urlpatterns = [
    path("", MyNotificationListView.as_view(), name="my-notifications"),
    path("<int:pk>/read/", mark_notification_read, name="mark-notification-read"),
    path("read-all/", mark_all_notifications_read, name="mark-all-notifications-read"),
]