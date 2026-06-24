from datetime import time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from ledgers.models import (
    Ledger,
    LedgerTemplate,
    LedgerTemplateTier,
    ResultPeriod,
)
from ledgers.services import get_user_current_result_period
from lottery.models import LotteryDraw


User = get_user_model()


class CurrentPeriodBettingOpenTests(TestCase):
    """`get_user_current_result_period` reports betting_open from the ledger window."""

    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959620000001", password="pass12345", name="Owner", role="owner"
        )
        now = timezone.now()
        self.period = ResultPeriod.objects.create(
            code="CUR-01",
            name="Current Period",
            result_date=now.date(),
            default_close_time=time(15, 0),
            status=ResultPeriod.Status.OPEN,
            is_visible_to_users=True,
            created_by=self.owner,
        )

    def _make_ledger(self, open_at, close_at):
        return Ledger.objects.create(
            result_period=self.period,
            name="Primary",
            capacity_per_number=Decimal("1000000.00"),
            settlement_rate=Decimal("700.00"),
            priority_order=1,
            open_at=open_at,
            close_at=close_at,
            created_by=self.owner,
        )

    def test_betting_open_when_ledger_in_window(self):
        now = timezone.now()
        close_at = now + timedelta(hours=2)
        self._make_ledger(now - timedelta(hours=1), close_at)

        data = get_user_current_result_period()

        self.assertTrue(data["betting_open"])
        self.assertEqual(data["betting_closes_at"], close_at)

    def test_betting_closed_when_window_elapsed(self):
        now = timezone.now()
        # Ledger still OPEN (auto-close not run yet) but past its close_at.
        self._make_ledger(now - timedelta(hours=3), now - timedelta(minutes=1))

        data = get_user_current_result_period()

        # Period is still returned so the UI can show a "closed" state.
        self.assertEqual(data["code"], "CUR-01")
        self.assertFalse(data["betting_open"])
        self.assertIsNone(data["betting_closes_at"])

    def test_betting_closes_at_is_latest_open_ledger(self):
        now = timezone.now()
        self._make_ledger(now - timedelta(hours=1), now + timedelta(hours=1))
        later = now + timedelta(hours=3)
        self._make_ledger(now - timedelta(hours=1), later)

        data = get_user_current_result_period()

        self.assertTrue(data["betting_open"])
        self.assertEqual(data["betting_closes_at"], later)


class OfficialResultEntryTests(APITestCase):
    """The official-result lookup and the enter-result provenance guard."""

    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959630000001", password="pass12345", name="Owner", role="owner"
        )
        now = timezone.now()
        self.period = ResultPeriod.objects.create(
            code="OFF-01",
            name="Official Test Period",
            result_date=now.date(),
            default_close_time=now.time(),
            status=ResultPeriod.Status.CLOSED,
            created_by=self.owner,
        )
        Ledger.objects.create(
            result_period=self.period,
            name="Primary",
            capacity_per_number=1000000,
            settlement_rate=700,
            priority_order=1,
            open_at=now,
            close_at=now,
            created_by=self.owner,
        )
        self.client.force_authenticate(self.owner)

    def _official_url(self):
        return f"/api/ledgers/admin/result-periods/{self.period.id}/official-result/"

    def _enter_url(self):
        return f"/api/ledgers/admin/result-periods/{self.period.id}/enter-result/"

    def test_official_result_unavailable_when_no_draw(self):
        response = self.client.get(self._official_url())
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["available"])

    def test_official_result_returns_matched_draw(self):
        LotteryDraw.objects.create(
            draw_date=self.period.result_date,
            first_prize="287184",
            three_up="184",
            two_down="48",
            source=LotteryDraw.Source.GLO,
            cross_check_ok=True,
        )
        response = self.client.get(self._official_url())

        self.assertTrue(response.data["available"])
        self.assertEqual(response.data["three_up"], "184")
        self.assertEqual(response.data["source"], "glo")
        self.assertIs(response.data["cross_check_ok"], True)

    def test_confirmed_source_requires_matching_official_number(self):
        LotteryDraw.objects.create(
            draw_date=self.period.result_date,
            first_prize="287184",
            three_up="184",
            source=LotteryDraw.Source.GLO,
        )
        # Claims "official confirmed" but the number doesn't match the draw.
        response = self.client.post(
            self._enter_url(),
            {"result_number": "999", "result_source": "api_checked_manual_confirmed"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.period.refresh_from_db()
        self.assertIsNone(self.period.result_number)

    def test_confirmed_source_accepts_matching_official_number(self):
        LotteryDraw.objects.create(
            draw_date=self.period.result_date,
            first_prize="287184",
            three_up="184",
            source=LotteryDraw.Source.GLO,
        )
        response = self.client.post(
            self._enter_url(),
            {"result_number": "184", "result_source": "api_checked_manual_confirmed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.period.refresh_from_db()
        self.assertEqual(self.period.result_number, "184")
        self.assertEqual(
            self.period.result_source,
            ResultPeriod.ResultSource.API_CHECKED_MANUAL_CONFIRMED,
        )

    def test_manual_entry_is_the_default_source(self):
        response = self.client.post(
            self._enter_url(),
            {"result_number": "555"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.period.refresh_from_db()
        self.assertEqual(self.period.result_source, ResultPeriod.ResultSource.MANUAL)


class LedgerNumberListEndpointTests(APITestCase):
    """Regression: the ledger-numbers list serializer must build (was crashing
    on an invalid read_only_fields)."""

    def test_lists_ledger_numbers(self):
        owner = User.objects.create_user(
            phone="+959670000001", password="pass12345", name="Owner", role="owner"
        )
        now = timezone.now()
        period = ResultPeriod.objects.create(
            code="LN-01",
            name="Ledger Numbers Period",
            result_date=now.date(),
            default_close_time=now.time(),
            status=ResultPeriod.Status.OPEN,
            created_by=owner,
        )
        ledger = Ledger.objects.create(
            result_period=period,
            name="Primary",
            capacity_per_number=1000,
            settlement_rate=700,
            priority_order=1,
            open_at=now,
            close_at=now,
            created_by=owner,
        )
        self.client.force_authenticate(owner)
        response = self.client.get(
            f"/api/ledgers/admin/ledgers/{ledger.id}/numbers/?page_size=5"
        )
        self.assertEqual(response.status_code, 200)


class LedgerTemplateBuildTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959700100001", password="pass12345", name="Owner", role="owner"
        )
        self.client.force_authenticate(self.owner)
        now = timezone.now()
        self.period = ResultPeriod.objects.create(
            code="TPL-01",
            name="Template Period",
            result_date=now.date(),
            default_close_time=time(15, 0),
            status=ResultPeriod.Status.OPEN,
            created_by=self.owner,
        )

    def _create_template(self):
        return self.client.post(
            "/api/ledgers/admin/ledger-templates/",
            {
                "name": "Standard",
                "tiers": [
                    {"name": "Primary", "capacity_per_number": "100000.00", "settlement_rate": "700.00", "priority_order": 1},
                    {"name": "Overflow", "capacity_per_number": "50000.00", "settlement_rate": "700.00", "priority_order": 2},
                ],
            },
            format="json",
        )

    def test_create_template_with_tiers(self):
        response = self._create_template()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["tiers"]), 2)

    def test_build_ledgers_from_template(self):
        template_id = self._create_template().data["id"]
        response = self.client.post(
            f"/api/ledgers/admin/result-periods/{self.period.id}/build-ledgers/",
            {"template_id": template_id},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        ledgers = Ledger.objects.filter(result_period=self.period).order_by("priority_order")
        self.assertEqual([ledger.name for ledger in ledgers], ["Primary", "Overflow"])
        self.assertEqual(ledgers.first().numbers.count(), 1000)  # auto-seeded

    def test_build_rejected_when_period_already_has_ledgers(self):
        template_id = self._create_template().data["id"]
        url = f"/api/ledgers/admin/result-periods/{self.period.id}/build-ledgers/"
        self.client.post(url, {"template_id": template_id}, format="json")
        again = self.client.post(url, {"template_id": template_id}, format="json")
        self.assertEqual(again.status_code, 400)
        self.assertEqual(Ledger.objects.filter(result_period=self.period).count(), 2)

    def test_templates_require_admin(self):
        user = User.objects.create_user(
            phone="+959700100002", password="pass12345", name="U", role="user"
        )
        self.client.force_authenticate(user)
        self.assertEqual(self._create_template().status_code, 403)


class PeriodScheduleTests(APITestCase):
    SCHEDULE_URL = "/api/ledgers/admin/period-schedule/"
    RUN_URL = "/api/ledgers/admin/period-schedule/run/"

    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+959700200001", password="pass12345", name="Owner", role="owner"
        )
        self.client.force_authenticate(self.owner)
        self.template = LedgerTemplate.objects.create(name="Std", created_by=self.owner)
        LedgerTemplateTier.objects.create(
            template=self.template,
            name="Primary",
            capacity_per_number=Decimal("100000.00"),
            settlement_rate=Decimal("700.00"),
            priority_order=1,
        )

    def _enable(self):
        return self.client.put(
            self.SCHEDULE_URL,
            {
                "is_enabled": True,
                "template": self.template.id,
                "default_close_time": "15:00",
                "days_ahead": 1,
                "active_weekdays": "0,1,2,3,4,5,6",
                "code_prefix": "",
            },
            format="json",
        )

    def test_enabling_requires_template_and_close_time(self):
        response = self.client.put(
            self.SCHEDULE_URL, {"is_enabled": True}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_run_creates_periods_with_ledgers(self):
        self.assertEqual(self._enable().status_code, 200)

        response = self.client.post(self.RUN_URL, {}, format="json")
        self.assertEqual(response.status_code, 200)
        # days_ahead=1 over all-active weekdays => today + tomorrow.
        self.assertEqual(len(response.data["created"]), 2)

        period = ResultPeriod.objects.order_by("result_date").first()
        self.assertEqual(period.status, ResultPeriod.Status.OPEN)
        ledger = Ledger.objects.filter(result_period=period).first()
        self.assertIsNotNone(ledger)
        self.assertEqual(ledger.numbers.count(), 1000)  # auto-seeded

    def test_run_is_idempotent(self):
        self._enable()
        self.client.post(self.RUN_URL, {}, format="json")
        before = ResultPeriod.objects.count()

        second = self.client.post(self.RUN_URL, {}, format="json")
        self.assertEqual(second.data["created"], [])
        self.assertEqual(ResultPeriod.objects.count(), before)

    def test_disabled_schedule_creates_nothing(self):
        response = self.client.post(self.RUN_URL, {}, format="json")
        self.assertFalse(response.data["enabled"])
        self.assertEqual(ResultPeriod.objects.count(), 0)

    def test_inactive_weekday_is_skipped(self):
        # Restrict to only the weekday that is neither today nor tomorrow, so
        # the horizon (today + tomorrow) yields no eligible day.
        today = timezone.localdate()
        excluded = {today.weekday(), (today + timedelta(days=1)).weekday()}
        allowed = [str(d) for d in range(7) if d not in excluded]

        self.client.put(
            self.SCHEDULE_URL,
            {
                "is_enabled": True,
                "template": self.template.id,
                "default_close_time": "15:00",
                "days_ahead": 1,
                "active_weekdays": ",".join(allowed),
            },
            format="json",
        )
        response = self.client.post(self.RUN_URL, {}, format="json")
        self.assertEqual(response.data["created"], [])

    def test_schedule_requires_admin(self):
        user = User.objects.create_user(
            phone="+959700200002", password="pass12345", name="U", role="user"
        )
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get(self.SCHEDULE_URL).status_code, 403)
