from datetime import time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from ledgers.models import ResultPeriod
from .models import Receipt, ReceiptItem


User = get_user_model()


class ReceiptPdfTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959600000001", password="pass12345", name="Owner", role="owner"
        )
        self.player = User.objects.create_user(
            phone="+959600000002", password="pass12345", name="Receipt Player", role="user"
        )
        self.other = User.objects.create_user(
            phone="+959600000003", password="pass12345", name="Other Player", role="user"
        )

        now = timezone.now()
        period = ResultPeriod.objects.create(
            code="RC-01",
            name="Receipt Period",
            result_date=now.date(),
            default_close_time=time(15, 0),
            status=ResultPeriod.Status.CLOSED,
            created_by=self.owner,
        )
        self.receipt = Receipt.objects.create(
            receipt_no="FB-RC01-000001",
            user=self.player,
            result_period=period,
            total_amount=Decimal("3000.00"),
            status=Receipt.Status.PAID,
            paid_at=now,
        )
        ReceiptItem.objects.create(
            receipt=self.receipt, number_code="124", amount=Decimal("3000.00")
        )

    def _pdf_url(self):
        return f"/api/receipts/{self.receipt.id}/pdf/"

    def test_requires_authentication(self):
        self.assertEqual(self.client.get(self._pdf_url()).status_code, 401)

    def test_owner_of_receipt_downloads_pdf(self):
        self.client.force_authenticate(self.player)
        response = self.client.get(self._pdf_url())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("FB-RC01-000001.pdf", response["Content-Disposition"])
        self.assertTrue(response.content.startswith(b"%PDF-"))

    def test_other_user_cannot_download(self):
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self._pdf_url()).status_code, 404)

    def test_admin_can_download_any_receipt(self):
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get(self._pdf_url()).status_code, 200)
