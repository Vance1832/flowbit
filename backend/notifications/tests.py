from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Notification


User = get_user_model()

BROADCAST_URL = "/api/notifications/admin/broadcast/"


class BroadcastNotificationTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959800000001", password="pass12345", name="Owner", role="owner"
        )
        self.staff = User.objects.create_user(
            phone="+959800000002", password="pass12345", name="Staff", role="staff"
        )
        self.user_a = User.objects.create_user(
            phone="+959800000003", password="pass12345", name="User A", role="user"
        )
        self.user_b = User.objects.create_user(
            phone="+959800000004", password="pass12345", name="User B", role="user"
        )

    def test_requires_admin_or_owner(self):
        self.client.force_authenticate(self.user_a)
        response = self.client.post(
            BROADCAST_URL,
            {"title": "Hi", "message": "Test", "audience": "all"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_broadcast_to_users_only(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            BROADCAST_URL,
            {"title": "Maintenance", "message": "Down 2-3 AM", "audience": "users"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["recipients"], 2)
        self.assertEqual(Notification.objects.filter(user=self.user_a).count(), 1)
        self.assertEqual(Notification.objects.filter(user=self.staff).count(), 0)
        note = Notification.objects.get(user=self.user_b)
        self.assertEqual(note.notification_type, Notification.NotificationType.SYSTEM)
        self.assertEqual(note.title, "Maintenance")

    def test_broadcast_excludes_sender(self):
        self.client.force_authenticate(self.owner)
        self.client.post(
            BROADCAST_URL,
            {"title": "All hands", "message": "Notice", "audience": "all"},
            format="json",
        )
        self.assertEqual(Notification.objects.filter(user=self.owner).count(), 0)
        # staff + 2 users = 3 recipients
        self.assertEqual(Notification.objects.count(), 3)

    def test_requires_title_and_message(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            BROADCAST_URL,
            {"title": "", "message": "", "audience": "all"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
