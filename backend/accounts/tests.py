from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase


User = get_user_model()

LOGIN_URL = "/api/auth/login/"
REGISTER_URL = "/api/accounts/register/"
LOGIN_RATE_LIMIT = 10  # keep in sync with THROTTLE_LOGIN default in settings


class AuthThrottleTests(APITestCase):
    def setUp(self):
        # Throttling is cache-backed; start each test from a clean slate.
        cache.clear()
        self.user = User.objects.create_user(
            phone="+959400000001", password="pass12345", name="Throttle User", role="user"
        )

    def tearDown(self):
        cache.clear()

    def test_login_succeeds_with_valid_credentials(self):
        response = self.client.post(
            LOGIN_URL, {"phone": "+959400000001", "password": "pass12345"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def test_login_is_rate_limited(self):
        statuses = [
            self.client.post(
                LOGIN_URL,
                {"phone": "+959400000001", "password": "wrong"},
                format="json",
            ).status_code
            for _ in range(LOGIN_RATE_LIMIT)
        ]
        self.assertNotIn(429, statuses)

        blocked = self.client.post(
            LOGIN_URL,
            {"phone": "+959400000001", "password": "wrong"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 429)


class RegistrationTests(APITestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_register_creates_user(self):
        response = self.client.post(
            REGISTER_URL,
            {
                "name": "New Player",
                "phone_country_code": "+95",
                "phone_number": "9444000111",
                "password": "strongpass123",
                "confirm_password": "strongpass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(phone="+959444000111").exists())

    def test_register_rejects_password_mismatch(self):
        response = self.client.post(
            REGISTER_URL,
            {
                "name": "Bad Player",
                "phone_country_code": "+95",
                "phone_number": "9444000222",
                "password": "strongpass123",
                "confirm_password": "different123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class ChangePasswordTests(APITestCase):
    URL = "/api/accounts/change-password/"

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            phone="+959910100001", password="oldpass123", name="PW User", role="user"
        )

    def tearDown(self):
        cache.clear()

    def test_requires_authentication(self):
        response = self.client.post(
            self.URL,
            {
                "current_password": "oldpass123",
                "new_password": "newpass123",
                "confirm_password": "newpass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_wrong_current_password_is_rejected(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.URL,
            {
                "current_password": "WRONG",
                "new_password": "newpass123",
                "confirm_password": "newpass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpass123"))

    def test_mismatched_new_passwords_rejected(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.URL,
            {
                "current_password": "oldpass123",
                "new_password": "newpass123",
                "confirm_password": "different123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_successful_change(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.URL,
            {
                "current_password": "oldpass123",
                "new_password": "newpass123",
                "confirm_password": "newpass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpass123"))
