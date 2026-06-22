from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from .models import KycSubmission, ResponsibleGamblingControl

ZERO = Decimal("0.00")


def get_or_create_control(user) -> ResponsibleGamblingControl:
    control, _ = ResponsibleGamblingControl.objects.get_or_create(user=user)
    return control


def _today_total(queryset, field: str) -> Decimal:
    start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    total = queryset.filter(created_at__gte=start).aggregate(t=Sum(field))["t"]
    return total or ZERO


def assert_can_deposit(user, amount: Decimal) -> None:
    """Raise ValueError if a deposit of ``amount`` is blocked for this user."""
    from wallets.models import DepositRequest

    control = getattr(user, "rg_control", None)
    if control is None:
        return
    if control.is_self_excluded():
        raise ValueError("Your account is self-excluded; deposits are disabled.")
    if control.daily_deposit_limit is not None:
        pending_or_done = DepositRequest.objects.filter(user=user).exclude(
            status=DepositRequest.Status.REJECTED
        )
        used = _today_total(pending_or_done, "amount")
        if used + amount > control.daily_deposit_limit:
            raise ValueError(
                f"Daily deposit limit of {control.daily_deposit_limit} would be exceeded "
                f"({used} already today)."
            )


def assert_can_stake(user, amount: Decimal) -> None:
    """Raise ValueError if staking ``amount`` is blocked for this user."""
    from receipts.models import Receipt

    control = getattr(user, "rg_control", None)
    if control is None:
        return
    if control.is_self_excluded():
        raise ValueError("Your account is self-excluded; betting is disabled.")
    if control.daily_stake_limit is not None:
        paid = Receipt.objects.filter(user=user, status=Receipt.Status.PAID)
        used = _today_total(paid, "total_amount")
        if used + amount > control.daily_stake_limit:
            raise ValueError(
                f"Daily betting limit of {control.daily_stake_limit} would be exceeded "
                f"({used} already today)."
            )


def latest_kyc_status(user) -> str:
    submission = user.kyc_submissions.order_by("-created_at").first()
    return submission.status if submission else "none"


def is_kyc_approved(user) -> bool:
    return user.kyc_submissions.filter(status=KycSubmission.Status.APPROVED).exists()


def assert_can_withdraw(user, amount: Decimal) -> None:
    """Require approved KYC for withdrawals at/above the configured threshold."""
    from wallets.services import get_decimal_setting

    # Default threshold is effectively off until an owner sets it.
    threshold = get_decimal_setting("kyc_withdrawal_threshold", Decimal("0"))
    if threshold > 0 and amount >= threshold and not is_kyc_approved(user):
        raise ValueError(
            "Identity verification (KYC) is required before withdrawing this amount."
        )
