import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase


def _png_bytes():
    buffer = BytesIO()
    Image.new("RGB", (10, 10), (16, 120, 89)).save(buffer, format="PNG")
    return buffer.getvalue()


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


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class AvatarUploadTests(APITestCase):
    URL = "/api/accounts/me/avatar/"

    def setUp(self):
        self.user = User.objects.create_user(
            phone="+959911222333", password="pass12345", name="Avatar User", role="user"
        )

    def test_requires_authentication(self):
        self.assertEqual(self.client.post(self.URL).status_code, 401)

    def test_rejects_non_image(self):
        self.client.force_authenticate(self.user)
        upload = SimpleUploadedFile("note.txt", b"hello", content_type="text/plain")
        response = self.client.post(self.URL, {"avatar": upload}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_upload_sets_avatar(self):
        self.client.force_authenticate(self.user)
        upload = SimpleUploadedFile("pic.png", _png_bytes(), content_type="image/png")
        response = self.client.post(self.URL, {"avatar": upload}, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["avatar_url"])
        self.user.refresh_from_db()
        self.assertTrue(bool(self.user.avatar))


from datetime import timedelta

from django.utils import timezone

from accounts.models import OtpCode
from accounts.otp import (
    MAX_ATTEMPTS,
    create_otp,
    create_password_reset_otp,
    verify_password_reset_otp,
)

User = get_user_model()


class PasswordResetOtpServiceTests(APITestCase):
    PHONE = "+959700000001"

    def setUp(self):
        self.user = User.objects.create_user(
            phone=self.PHONE, password="oldpass12345", name="Reset User", role="user"
        )

    def test_correct_code_verifies_and_consumes(self):
        code = create_password_reset_otp(self.PHONE)
        self.assertTrue(verify_password_reset_otp(self.PHONE, code))
        # Single-use: a second verify of the same code fails.
        self.assertFalse(verify_password_reset_otp(self.PHONE, code))

    def test_wrong_code_increments_attempts(self):
        create_password_reset_otp(self.PHONE)
        self.assertFalse(verify_password_reset_otp(self.PHONE, "000000"))
        otp = OtpCode.objects.filter(phone=self.PHONE).latest("created_at")
        self.assertEqual(otp.attempts, 1)
        self.assertIsNone(otp.consumed_at)

    def test_locks_out_after_max_attempts(self):
        code = create_password_reset_otp(self.PHONE)
        for _ in range(MAX_ATTEMPTS):
            verify_password_reset_otp(self.PHONE, "111111")
        # Even the correct code is refused once attempts are exhausted.
        self.assertFalse(verify_password_reset_otp(self.PHONE, code))

    def test_expired_code_is_rejected(self):
        code = create_password_reset_otp(self.PHONE)
        otp = OtpCode.objects.filter(phone=self.PHONE).latest("created_at")
        otp.expires_at = timezone.now() - timedelta(minutes=1)
        otp.save(update_fields=["expires_at"])
        self.assertFalse(verify_password_reset_otp(self.PHONE, code))

    def test_new_request_invalidates_previous_code(self):
        first = create_password_reset_otp(self.PHONE)
        create_password_reset_otp(self.PHONE)
        self.assertFalse(verify_password_reset_otp(self.PHONE, first))


class PasswordResetEndpointTests(APITestCase):
    PHONE = "+959700000002"
    REQUEST_URL = "/api/accounts/password-reset/request/"
    CONFIRM_URL = "/api/accounts/password-reset/confirm/"

    def setUp(self):
        cache.clear()  # avoid throttle bleed between tests
        self.user = User.objects.create_user(
            phone=self.PHONE, password="oldpass12345", name="Reset User", role="user"
        )

    @override_settings(DEBUG=True)
    def test_request_issues_code_for_known_phone(self):
        response = self.client.post(self.REQUEST_URL, {"phone": self.PHONE}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("debug_code", response.data)
        self.assertEqual(OtpCode.objects.filter(phone=self.PHONE).count(), 1)

    def test_request_unknown_phone_is_generic_and_creates_no_code(self):
        response = self.client.post(
            self.REQUEST_URL, {"phone": "+959709999999"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("debug_code", response.data)
        self.assertEqual(OtpCode.objects.count(), 0)

    @override_settings(OTP_DELIVERY_CHANNELS=["sms"], TWILIO_ACCOUNT_SID="")
    def test_request_succeeds_even_when_delivery_fails(self):
        # SMS unconfigured -> delivery raises; the request must still 200 (no
        # enumeration / no 500) and the code is still issued.
        response = self.client.post(self.REQUEST_URL, {"phone": self.PHONE}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(OtpCode.objects.filter(phone=self.PHONE).count(), 1)

    def test_confirm_sets_new_password(self):
        code = create_password_reset_otp(self.PHONE)
        response = self.client.post(
            self.CONFIRM_URL,
            {
                "phone": self.PHONE,
                "code": code,
                "new_password": "BrandNew123!",
                "confirm_password": "BrandNew123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNew123!"))

    def test_confirm_rejects_wrong_code(self):
        create_password_reset_otp(self.PHONE)
        response = self.client.post(
            self.CONFIRM_URL,
            {
                "phone": self.PHONE,
                "code": "000000",
                "new_password": "BrandNew123!",
                "confirm_password": "BrandNew123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpass12345"))


from django.core import mail
from django.test import SimpleTestCase

from accounts.messaging import OtpDeliveryError, send_password_reset_otp


class OtpDeliveryChannelTests(SimpleTestCase):
    PHONE = "+959700000050"
    EMAIL = "reset@example.com"

    @override_settings(OTP_DELIVERY_CHANNELS=["console"])
    def test_console_channel_is_used_by_default(self):
        channel = send_password_reset_otp(self.PHONE, self.EMAIL, "123456")
        self.assertEqual(channel, "console")
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(
        OTP_DELIVERY_CHANNELS=["email"],
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_email_channel_delivers_the_code(self):
        channel = send_password_reset_otp(self.PHONE, self.EMAIL, "654321")
        self.assertEqual(channel, "email")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("654321", mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].to, [self.EMAIL])

    @override_settings(
        OTP_DELIVERY_CHANNELS=["sms", "email"],
        TWILIO_ACCOUNT_SID="",  # SMS not configured -> first channel fails
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_sms_failure_falls_back_to_email(self):
        channel = send_password_reset_otp(self.PHONE, self.EMAIL, "111222")
        self.assertEqual(channel, "email")
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(OTP_DELIVERY_CHANNELS=["sms", "email"], TWILIO_ACCOUNT_SID="")
    def test_all_channels_failing_raises(self):
        # SMS unconfigured and no email address -> nothing can deliver.
        with self.assertRaises(OtpDeliveryError):
            send_password_reset_otp(self.PHONE, None, "999000")


class PhoneVerificationEndpointTests(APITestCase):
    PHONE = "+959700000060"
    REQUEST_URL = "/api/accounts/phone-verification/request/"
    CONFIRM_URL = "/api/accounts/phone-verification/confirm/"

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            phone=self.PHONE, password="pass12345", name="Verify User", role="user"
        )
        self.client.force_authenticate(self.user)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.REQUEST_URL).status_code, 401)

    @override_settings(DEBUG=True)
    def test_request_then_confirm_marks_phone_verified(self):
        request = self.client.post(self.REQUEST_URL, format="json")
        self.assertEqual(request.status_code, 200)

        confirm = self.client.post(
            self.CONFIRM_URL, {"code": request.data["debug_code"]}, format="json"
        )
        self.assertEqual(confirm.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.phone_verified)

    def test_confirm_rejects_wrong_code(self):
        self.client.post(self.REQUEST_URL, format="json")
        confirm = self.client.post(self.CONFIRM_URL, {"code": "000000"}, format="json")
        self.assertEqual(confirm.status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.phone_verified)

    def test_reset_code_cannot_verify_phone(self):
        # Purpose scoping: a password-reset code must not verify the phone.
        reset_code = create_password_reset_otp(self.PHONE)
        confirm = self.client.post(self.CONFIRM_URL, {"code": reset_code}, format="json")
        self.assertEqual(confirm.status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.phone_verified)


class EmailVerificationEndpointTests(APITestCase):
    PHONE = "+959700000070"
    REQUEST_URL = "/api/accounts/email-verification/request/"
    CONFIRM_URL = "/api/accounts/email-verification/confirm/"

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            phone=self.PHONE,
            password="pass12345",
            name="Verify Email",
            role="user",
            email="verify@example.com",
        )
        self.client.force_authenticate(self.user)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.REQUEST_URL).status_code, 401)

    def test_request_requires_an_email_on_file(self):
        no_email = User.objects.create_user(
            phone="+959700000071", password="pass12345", name="No Email", role="user"
        )
        self.client.force_authenticate(no_email)
        response = self.client.post(self.REQUEST_URL, format="json")
        self.assertEqual(response.status_code, 400)

    @override_settings(
        DEBUG=True,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_request_then_confirm_marks_email_verified(self):
        request = self.client.post(self.REQUEST_URL, format="json")
        self.assertEqual(request.status_code, 200)

        confirm = self.client.post(
            self.CONFIRM_URL, {"code": request.data["debug_code"]}, format="json"
        )
        self.assertEqual(confirm.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_confirm_rejects_wrong_code(self):
        self.client.post(self.REQUEST_URL, format="json")
        confirm = self.client.post(self.CONFIRM_URL, {"code": "000000"}, format="json")
        self.assertEqual(confirm.status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.email_verified)


from accounts.tasks import send_otp_task


class OtpTaskTests(SimpleTestCase):
    PHONE = "+959700000080"
    EMAIL = "task@example.com"

    @override_settings(
        OTP_DELIVERY_CHANNELS=["email"],
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_delivers_the_code(self):
        send_otp_task("password_reset", self.PHONE, self.EMAIL, "123456")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("123456", mail.outbox[0].body)

    @override_settings(OTP_DELIVERY_CHANNELS=["sms"], TWILIO_ACCOUNT_SID="")
    def test_swallows_delivery_failure(self):
        # SMS unconfigured -> the task must log and return, never raise.
        send_otp_task("password_reset", self.PHONE, None, "123456")

    def test_ignores_unknown_kind(self):
        send_otp_task("nope", self.PHONE, self.EMAIL, "123456")


class HealthzTests(APITestCase):
    def test_healthz_returns_ok(self):
        response = self.client.get("/healthz/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")


class JwtSessionTests(APITestCase):
    PHONE = "+959700000090"
    PASSWORD = "pass12345"

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            phone=self.PHONE, password=self.PASSWORD, name="Session User", role="user"
        )

    def tearDown(self):
        cache.clear()

    def _login(self):
        return self.client.post(
            "/api/auth/login/", {"phone": self.PHONE, "password": self.PASSWORD}, format="json"
        )

    def test_logout_blacklists_refresh_token(self):
        refresh = self._login().data["refresh"]
        self.client.force_authenticate(self.user)

        logout = self.client.post("/api/auth/logout/", {"refresh": refresh}, format="json")
        self.assertEqual(logout.status_code, 200)

        self.client.force_authenticate(None)
        reused = self.client.post("/api/auth/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(reused.status_code, 401)

    def test_refresh_rotates_and_blacklists_the_old_token(self):
        first_refresh = self._login().data["refresh"]

        rotated = self.client.post(
            "/api/auth/refresh/", {"refresh": first_refresh}, format="json"
        )
        self.assertEqual(rotated.status_code, 200)
        self.assertIn("refresh", rotated.data)  # rotation returns a new refresh
        self.assertNotEqual(rotated.data["refresh"], first_refresh)

        # The old refresh is now blacklisted and can't be reused.
        reused = self.client.post(
            "/api/auth/refresh/", {"refresh": first_refresh}, format="json"
        )
        self.assertEqual(reused.status_code, 401)


class ApiSchemaTests(APITestCase):
    def test_openapi_schema_generates(self):
        # Also a smoke test that every endpoint's schema builds without error.
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, 200)

    def test_swagger_ui_serves(self):
        response = self.client.get("/api/docs/")
        self.assertEqual(response.status_code, 200)


class LoginTwoFactorTests(APITestCase):
    LOGIN_URL = "/api/auth/login/"
    VERIFY_URL = "/api/auth/login/2fa/verify/"
    SETTINGS_URL = "/api/auth/2fa/"
    PHONE = "+959410000009"
    PASSWORD = "pass12345"

    def setUp(self):
        cache.clear()
        self.owner = User.objects.create_user(
            phone=self.PHONE, password=self.PASSWORD, name="2FA Owner", role="owner"
        )

    def tearDown(self):
        cache.clear()

    def _login(self):
        return self.client.post(
            self.LOGIN_URL, {"phone": self.PHONE, "password": self.PASSWORD}, format="json"
        )

    def test_login_without_2fa_returns_tokens(self):
        response = self._login()
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertNotIn("two_factor_required", response.data)

    @override_settings(DEBUG=True)
    def test_login_with_2fa_challenges_instead_of_issuing_tokens(self):
        self.owner.two_factor_enabled = True
        self.owner.save(update_fields=["two_factor_enabled"])

        response = self._login()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("two_factor_required"))
        self.assertNotIn("access", response.data)
        self.assertEqual(
            OtpCode.objects.filter(
                phone=self.PHONE, purpose=OtpCode.Purpose.LOGIN_2FA
            ).count(),
            1,
        )

    def test_verify_with_correct_code_returns_tokens(self):
        self.owner.two_factor_enabled = True
        self.owner.save(update_fields=["two_factor_enabled"])
        code = create_otp(self.PHONE, OtpCode.Purpose.LOGIN_2FA)

        response = self.client.post(
            self.VERIFY_URL, {"phone": self.PHONE, "code": code}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["role"], "owner")

    def test_verify_with_wrong_code_is_rejected(self):
        self.owner.two_factor_enabled = True
        self.owner.save(update_fields=["two_factor_enabled"])
        create_otp(self.PHONE, OtpCode.Purpose.LOGIN_2FA)

        response = self.client.post(
            self.VERIFY_URL, {"phone": self.PHONE, "code": "000000"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_owner_can_enable_and_disable(self):
        self.client.force_authenticate(self.owner)

        enabled = self.client.post(self.SETTINGS_URL, {"enabled": True}, format="json")
        self.assertEqual(enabled.status_code, 200)
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.two_factor_enabled)

        disabled = self.client.post(self.SETTINGS_URL, {"enabled": False}, format="json")
        self.assertEqual(disabled.status_code, 200)
        self.owner.refresh_from_db()
        self.assertFalse(self.owner.two_factor_enabled)

    def test_regular_user_cannot_enable(self):
        member = User.objects.create_user(
            phone="+959410000010", password=self.PASSWORD, name="Member", role="user"
        )
        self.client.force_authenticate(member)

        response = self.client.post(self.SETTINGS_URL, {"enabled": True}, format="json")
        self.assertEqual(response.status_code, 403)
        member.refresh_from_db()
        self.assertFalse(member.two_factor_enabled)
