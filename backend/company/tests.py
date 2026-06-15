from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


User = get_user_model()

ANALYTICS_URL = "/api/company/admin/analytics/"


class AnalyticsApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959700000001", password="pass12345", name="Owner", role="owner"
        )
        self.member = User.objects.create_user(
            phone="+959700000002", password="pass12345", name="Member", role="user"
        )

    def test_requires_admin_or_owner(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(ANALYTICS_URL).status_code, 403)

    def test_returns_analytics_shape(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(ANALYTICS_URL)

        self.assertEqual(response.status_code, 200)
        self.assertIn("summary", response.data)
        self.assertIn("period_performance", response.data)
        self.assertIn("cashflow", response.data)
        # 14-day cashflow window
        self.assertEqual(len(response.data["cashflow"]), 14)
        for key in (
            "total_collected",
            "total_settlement",
            "net_profit_loss",
            "reserve_balance",
        ):
            self.assertIn(key, response.data["summary"])
