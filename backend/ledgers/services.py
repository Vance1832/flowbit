from datetime import timedelta

from django.utils import timezone

from settlements.models import SettlementItem
from audit.models import AuditLog
from audit.services import create_audit_log


def get_user_current_result_period():
    from .models import Ledger, ResultPeriod

    periods = ResultPeriod.objects.filter(
        is_visible_to_users=True, status=ResultPeriod.Status.OPEN
    )

    period = periods.order_by("result_date", "default_close_time").first()

    if period is None:
        return None

    # Betting is only actually open when at least one ledger is inside its
    # [open_at, close_at) window — the same rule the submission service enforces.
    # The period status can still read "open" before the auto-close job runs, so
    # the client must rely on `betting_open` rather than status alone.
    now = timezone.now()
    open_ledgers = list(
        period.ledgers
        .filter(status=Ledger.Status.OPEN, open_at__lte=now, close_at__gt=now)
        .order_by("close_at")
    )
    betting_open = bool(open_ledgers)
    # When betting is open, this is the moment the last in-window ledger closes.
    betting_closes_at = open_ledgers[-1].close_at if open_ledgers else None

    return {
        "code": period.code,
        "name": period.name,
        "result_date": period.result_date,
        "default_close_time": period.default_close_time,
        "status": period.status,
        "betting_open": betting_open,
        "betting_closes_at": betting_closes_at,
    }


def get_user_result_overview(user):
    from .models import ResultPeriod

    current_open_period = get_user_current_result_period()
    visible_threshold = timezone.now() - timedelta(days=3)

    latest_visible_period = (
        ResultPeriod.objects
        .filter(
            is_visible_to_users=True,
            result_number__isnull=False,
            result_entered_at__gte=visible_threshold,
        )
        .exclude(result_number="")
        .exclude(status=ResultPeriod.Status.OPEN)
        .order_by("-result_entered_at", "-result_date")
        .first()
    )

    latest_visible_result = None

    if latest_visible_period is not None:
        latest_visible_result = {
            "code": latest_visible_period.code,
            "name": latest_visible_period.name,
            "result_date": latest_visible_period.result_date,
            "result_number": latest_visible_period.result_number,
            "settled_at": latest_visible_period.result_entered_at,
            "visible_until": latest_visible_period.result_entered_at + timedelta(days=3),
        }

    return {
        "current_open_period": current_open_period,
        "latest_visible_result": latest_visible_result,
        "recent_results": get_user_visible_results(user),
    }


def get_user_visible_results(user):
    """
    Normal user result page:
    - show result date
    - show result number
    - only show matched status if user's settlement item is paid
    """

    from .models import ResultPeriod

    result_periods = (
        ResultPeriod.objects
        .filter(
            is_visible_to_users=True,
            result_number__isnull=False,
        )
        .exclude(result_number="")
        .order_by("-result_date")
    )

    results = []

    for period in result_periods:
        receipt = (
            user.receipts
            .filter(result_period=period)
            .order_by("-created_at")
            .first()
        )
        settlement_item = (
            SettlementItem.objects
            .filter(settlement_batch__result_period=period, user=user)
            .order_by("-created_at")
            .first()
        )

        data = {
            "period_code": period.code,
            "result_date": period.result_date,
            "result_number": period.result_number,
        }

        if settlement_item is not None:
            source_receipt = (
                settlement_item.sources.select_related("receipt_item__receipt").first()
            )
            data["status"] = (
                "Matched - Confirmed and Paid Out"
                if settlement_item.status == SettlementItem.Status.PAID
                else "Matched"
            )
            data["my_receipt_status"] = "Matched"
            data["matched_receipt_no"] = (
                source_receipt.receipt_item.receipt.receipt_no
                if source_receipt is not None
                else (receipt.receipt_no if receipt is not None else None)
            )
            data["matched_number"] = settlement_item.number_code
            data["matched_amount"] = settlement_item.total_matched_amount
            data["settlement_amount"] = settlement_item.settlement_amount
            data["wallet_credit_status"] = settlement_item.status
        elif receipt is not None:
            data["status"] = "Published"
            data["my_receipt_status"] = "No Match"
        else:
            data["status"] = "Published"
            data["my_receipt_status"] = "No Receipt"

        results.append(data)

    return results

from django.db import transaction

from settlements.services import create_settlement_preview


@transaction.atomic
def close_result_period(result_period, admin_user):
    result_period = result_period.__class__.objects.select_for_update().get(id=result_period.id)
    previous_status = result_period.status

    if result_period.status not in [
        result_period.Status.OPEN,
        result_period.Status.CLOSED,
    ]:
        raise ValueError("Only open or closed result periods can be closed.")

    result_period.status = result_period.Status.CLOSED
    result_period.save(update_fields=["status", "updated_at"])

    ledgers = result_period.ledgers.select_for_update().filter(status="open")

    for ledger in ledgers:
        ledger.status = "closed"
        ledger.manually_closed_by = admin_user
        ledger.manually_closed_at = timezone.now()
        ledger.save(update_fields=["status", "manually_closed_by", "manually_closed_at", "updated_at"])

    create_audit_log(
        actor_user=admin_user,
        action=AuditLog.ActionType.CLOSE,
        target_table="result_periods",
        target_id=result_period.id,
        old_values={"status": previous_status},
        new_values={"status": result_period.status},
        reason="Result period closed.",
    )

    return result_period


@transaction.atomic
def enter_result_and_preview_settlement(
    result_period, result_number, admin_user, result_source=None
):
    from .models import ResultPeriod

    result_source = result_source or ResultPeriod.ResultSource.MANUAL

    result_period = result_period.__class__.objects.select_for_update().get(id=result_period.id)
    previous_status = result_period.status

    if result_period.status not in [
        result_period.Status.CLOSED,
        result_period.Status.OPEN,
    ]:
        raise ValueError("Result can only be entered for open or closed result periods.")

    if result_period.status == result_period.Status.OPEN:
        close_result_period(result_period, admin_user)

    batch = create_settlement_preview(
        result_period=result_period,
        result_number=result_number,
        admin_user=admin_user,
        result_source=result_source,
    )

    create_audit_log(
        actor_user=admin_user,
        action=AuditLog.ActionType.RESULT_ENTRY,
        target_table="result_periods",
        target_id=result_period.id,
        old_values={"status": previous_status},
        new_values={
            "status": result_period.Status.SETTLEMENT_PREVIEWED,
            "result_number": batch.result_number,
            "settlement_batch_id": batch.id,
        },
        reason="Result entered and settlement preview created.",
    )

    return batch


import datetime

from django.utils import timezone as _tz


@transaction.atomic
def build_ledgers_from_template(result_period, template, admin_user):
    """Create one ledger per template tier for the period, in one step.

    Open/close times come from the period: open now, close at the period's
    result_date + default_close_time. Refuses if the period already has ledgers.
    """
    from .models import Ledger

    result_period = result_period.__class__.objects.select_for_update().get(id=result_period.id)

    if result_period.ledgers.exists():
        raise ValueError("This period already has ledgers. Remove them first to rebuild.")

    tiers = list(template.tiers.all())
    if not tiers:
        raise ValueError("This template has no tiers.")

    now = _tz.now()
    close_naive = datetime.datetime.combine(
        result_period.result_date, result_period.default_close_time
    )
    close_at = _tz.make_aware(close_naive) if _tz.is_naive(close_naive) else close_naive

    created = []
    for tier in tiers:
        created.append(
            Ledger.objects.create(
                result_period=result_period,
                name=tier.name,
                capacity_per_number=tier.capacity_per_number,
                settlement_rate=tier.settlement_rate,
                priority_order=tier.priority_order,
                open_at=now,
                close_at=close_at,
                created_by=admin_user,
            )
        )

    create_audit_log(
        actor_user=admin_user,
        action=AuditLog.ActionType.CREATE,
        target_table="ledgers",
        target_id=result_period.id,
        new_values={
            "result_period": result_period.code,
            "template": template.name,
            "ledgers_created": len(created),
        },
        reason=f"Built {len(created)} ledger(s) from template '{template.name}'.",
    )

    return created


def get_period_schedule():
    """Return the singleton schedule config, creating an empty one if needed."""
    from .models import PeriodSchedule

    schedule, _ = PeriodSchedule.objects.get_or_create(pk=1)
    return schedule


def _scheduled_period_code(schedule, result_date):
    return f"{schedule.code_prefix}{result_date:%y%m%d}"


def _create_scheduled_period(schedule, result_date, actor):
    """Create one open period for ``result_date`` plus ledgers from the template."""
    from .models import Ledger, ResultPeriod

    period = ResultPeriod.objects.create(
        code=_scheduled_period_code(schedule, result_date),
        name=f"{result_date:%b %d, %Y} Period",
        result_date=result_date,
        default_close_time=schedule.default_close_time,
        created_by=actor,
        status=ResultPeriod.Status.OPEN,
    )

    # Ledgers open at the start of the result day and close at the configured
    # time, so a pre-created future period doesn't accept bets early.
    open_naive = datetime.datetime.combine(result_date, datetime.time.min)
    close_naive = datetime.datetime.combine(result_date, schedule.default_close_time)
    open_at = _tz.make_aware(open_naive) if _tz.is_naive(open_naive) else open_naive
    close_at = _tz.make_aware(close_naive) if _tz.is_naive(close_naive) else close_naive

    ledger_count = 0
    for tier in schedule.template.tiers.all():
        Ledger.objects.create(
            result_period=period,
            name=tier.name,
            capacity_per_number=tier.capacity_per_number,
            settlement_rate=tier.settlement_rate,
            priority_order=tier.priority_order,
            open_at=open_at,
            close_at=close_at,
            created_by=actor,
        )
        ledger_count += 1

    create_audit_log(
        actor_user=actor,
        action=AuditLog.ActionType.CREATE,
        target_table="result_periods",
        target_id=period.id,
        new_values={
            "code": period.code,
            "result_date": str(result_date),
            "ledgers_created": ledger_count,
        },
        reason="Auto-created scheduled result period and ledgers.",
    )
    return period


@transaction.atomic
def ensure_scheduled_periods(now=None, dry_run=False):
    """Ensure an open period exists for each active day within the horizon.

    Returns a summary dict. Idempotent: a day that already has a period (by
    result_date or generated code) is skipped, so it is safe to run often.
    """
    from .models import ResultPeriod

    schedule = get_period_schedule()

    if not schedule.is_enabled:
        return {"enabled": False, "created": [], "reason": "Scheduling is disabled."}
    if schedule.template_id is None or schedule.default_close_time is None:
        return {
            "enabled": True,
            "created": [],
            "reason": "Schedule needs a template and a close time.",
        }
    if schedule.updated_by_id is None:
        return {
            "enabled": True,
            "created": [],
            "reason": "Schedule has no owner to attribute created periods to.",
        }

    now = now or _tz.now()
    today = _tz.localdate(now)
    weekdays = schedule.active_weekday_set()

    created = []
    for offset in range(schedule.days_ahead + 1):
        result_date = today + timedelta(days=offset)
        if weekdays and result_date.weekday() not in weekdays:
            continue

        code = _scheduled_period_code(schedule, result_date)
        already = (
            ResultPeriod.objects.filter(result_date=result_date).exists()
            or ResultPeriod.objects.filter(code=code).exists()
        )
        if already:
            continue

        if dry_run:
            created.append(code)
            continue

        period = _create_scheduled_period(schedule, result_date, schedule.updated_by)
        created.append(period.code)

    if not dry_run:
        schedule.last_run_at = now
        schedule.save(update_fields=["last_run_at", "updated_at"])

    return {"enabled": True, "created": created, "reason": None}
