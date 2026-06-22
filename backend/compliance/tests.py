import tempfile
from datetime import timedelta
from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APITestCase

from compliance.models import KycSubmission
from compliance.services import (
    assert_can_deposit,
    assert_can_stake,
    assert_can_withdraw,
    get_or_create_control,
    is_kyc_approved,
)
from wallets.models import DepositRequest, SystemSetting, UserWallet

User = get_user_model()


def _png_bytes():
    buffer = BytesIO()
    Image.new("RGB", (10, 10), (16, 120, 89)).save(buffer, format="PNG")
    return buffer.getvalue()


class ResponsibleGamblingServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone="+959680000001", password="pass12345", name="RG", role="user"
        )

    def test_deposit_limit_accumulates_and_blocks(self):
        control = get_or_create_control(self.user)
        control.daily_deposit_limit = Decimal("10000.00")
        control.save()

        assert_can_deposit(self.user, Decimal("5000.00"))  # under limit, ok

        wallet = UserWallet.objects.get(user=self.user)
        DepositRequest.objects.create(user=self.user, wallet=wallet, amount=Decimal("8000.00"))
        with self.assertRaises(ValueError):
            assert_can_deposit(self.user, Decimal("5000.00"))  # 8000 + 5000 > 10000

    def test_self_exclusion_blocks_deposit_and_stake(self):
        control = get_or_create_control(self.user)
        control.self_excluded_until = timezone.now() + timedelta(days=1)
        control.save()

        with self.assertRaises(ValueError):
            assert_can_deposit(self.user, Decimal("100.00"))
        with self.assertRaises(ValueError):
            assert_can_stake(self.user, Decimal("100.00"))

    def test_stake_over_daily_limit_blocked(self):
        control = get_or_create_control(self.user)
        control.daily_stake_limit = Decimal("100.00")
        control.save()

        assert_can_stake(self.user, Decimal("100.00"))  # exactly at limit, ok
        with self.assertRaises(ValueError):
            assert_can_stake(self.user, Decimal("150.00"))

    def test_no_control_means_no_restriction(self):
        # A user who never set limits is unrestricted.
        assert_can_deposit(self.user, Decimal("999999.00"))
        assert_can_stake(self.user, Decimal("999999.00"))


class ResponsibleGamblingApiTests(APITestCase):
    URL = "/api/compliance/responsible-gambling/"

    def setUp(self):
        self.user = User.objects.create_user(
            phone="+959680000002", password="pass12345", name="RG2", role="user"
        )
        self.client.force_authenticate(self.user)

    def test_get_creates_and_returns_control(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["daily_deposit_limit"])

    def test_user_can_set_own_limits(self):
        response = self.client.put(
            self.URL, {"daily_deposit_limit": "5000.00"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["daily_deposit_limit"], "5000.00")


class WithdrawalKycGateTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone="+959680000003", password="pass12345", name="KYC", role="user"
        )

    def test_threshold_unset_allows_withdrawal(self):
        assert_can_withdraw(self.user, Decimal("999999.00"))  # no threshold => ok

    def test_large_withdrawal_requires_kyc(self):
        SystemSetting.objects.create(setting_key="kyc_withdrawal_threshold", setting_value="1000")

        with self.assertRaises(ValueError):
            assert_can_withdraw(self.user, Decimal("2000.00"))

        KycSubmission.objects.create(
            user=self.user,
            document_type=KycSubmission.DocumentType.NRC,
            document_number="12/ABC(N)123456",
            document_image="kyc/x.png",
            status=KycSubmission.Status.APPROVED,
        )
        self.assertTrue(is_kyc_approved(self.user))
        assert_can_withdraw(self.user, Decimal("2000.00"))  # now allowed


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class KycSubmissionApiTests(APITestCase):
    LIST_URL = "/api/compliance/kyc/"

    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959680000004", password="pass12345", name="Owner", role="owner"
        )
        self.user = User.objects.create_user(
            phone="+959680000005", password="pass12345", name="Submitter", role="user"
        )

    def _submit(self):
        self.client.force_authenticate(self.user)
        upload = SimpleUploadedFile("id.png", _png_bytes(), content_type="image/png")
        return self.client.post(
            self.LIST_URL,
            {"document_type": "nrc", "document_number": "12/ABC(N)123456", "document_image": upload},
            format="multipart",
        )

    def test_user_submits_and_owner_approves(self):
        submit = self._submit()
        self.assertEqual(submit.status_code, 201)
        submission_id = submit.data["id"]

        self.client.force_authenticate(self.owner)
        review = self.client.post(
            f"/api/compliance/admin/kyc/{submission_id}/review/",
            {"status": "approved", "review_note": "verified"},
            format="json",
        )
        self.assertEqual(review.status_code, 200)
        self.assertEqual(review.data["status"], "approved")
        self.assertTrue(is_kyc_approved(self.user))

    def test_review_requires_admin(self):
        submit = self._submit()
        submission_id = submit.data["id"]
        # The submitting user (role=user) cannot review.
        self.client.force_authenticate(self.user)
        review = self.client.post(
            f"/api/compliance/admin/kyc/{submission_id}/review/",
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(review.status_code, 403)
