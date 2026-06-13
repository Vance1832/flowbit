from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

from audit.models import AuditLog
from audit.services import create_audit_log
from notifications.models import Notification
from notifications.services import create_notification

from .models import (
    DepositRequest,
    SystemSetting,
    UserWallet,
    WalletTransaction,
    WithdrawalRequest,
)


def get_setting(key, default=None):
    """Return a system setting value, or `default` if unset/blank."""
    setting = SystemSetting.objects.filter(setting_key=key).first()
    if setting and setting.setting_value not in (None, ""):
        return setting.setting_value
    return default


def get_decimal_setting(key, default):
    """Return a system setting as a Decimal, falling back to `default`."""
    raw = get_setting(key, None)
    try:
        return Decimal(str(raw)) if raw is not None else Decimal(str(default))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal(str(default))


@transaction.atomic
def assign_deposit_request(deposit_request: DepositRequest, staff_user):
    deposit_request = DepositRequest.objects.select_for_update().get(id=deposit_request.id)

    if deposit_request.status != DepositRequest.Status.PENDING:
        raise ValueError("Only pending deposit requests can be assigned.")

    deposit_request.status = DepositRequest.Status.IN_REVIEW
    deposit_request.assigned_to = staff_user
    deposit_request.assigned_at = timezone.now()
    deposit_request.save(update_fields=["status", "assigned_to", "assigned_at", "updated_at"])

    create_audit_log(
        actor_user=staff_user,
        action=AuditLog.ActionType.UPDATE,
        target_table="deposit_requests",
        target_id=deposit_request.id,
        reason="Deposit request assigned for review.",
    )

    return deposit_request


@transaction.atomic
def approve_deposit_request(deposit_request: DepositRequest, staff_user, staff_note=None):
    deposit_request = DepositRequest.objects.select_for_update().get(id=deposit_request.id)

    if deposit_request.status not in [
        DepositRequest.Status.PENDING,
        DepositRequest.Status.IN_REVIEW,
    ]:
        raise ValueError("Only pending or in-review deposits can be approved.")

    wallet = UserWallet.objects.select_for_update().get(id=deposit_request.wallet_id)

    balance_before = wallet.balance
    wallet.balance += deposit_request.amount
    wallet.save(update_fields=["balance", "updated_at"])

    wallet_transaction = WalletTransaction.objects.create(
        wallet=wallet,
        user=deposit_request.user,
        transaction_type=WalletTransaction.TransactionType.DEPOSIT,
        amount=deposit_request.amount,
        balance_before=balance_before,
        balance_after=wallet.balance,
        reference_table="deposit_requests",
        reference_id=deposit_request.id,
        description="Deposit approved",
        created_by=staff_user,
    )

    deposit_request.status = DepositRequest.Status.APPROVED
    deposit_request.reviewed_by = staff_user
    deposit_request.reviewed_at = timezone.now()

    if staff_note:
        deposit_request.staff_note = staff_note

    deposit_request.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "staff_note",
            "updated_at",
        ]
    )

    create_notification(
        user=deposit_request.user,
        notification_type=Notification.NotificationType.DEPOSIT,
        title="Deposit Approved",
        message=f"Your deposit of {deposit_request.amount} has been approved.",
        reference_table="deposit_requests",
        reference_id=deposit_request.id,
    )

    create_audit_log(
        actor_user=staff_user,
        action=AuditLog.ActionType.APPROVE,
        target_table="deposit_requests",
        target_id=deposit_request.id,
        reason=staff_note,
    )

    return deposit_request, wallet_transaction


@transaction.atomic
def reject_deposit_request(deposit_request: DepositRequest, staff_user, staff_note=None):
    deposit_request = DepositRequest.objects.select_for_update().get(id=deposit_request.id)

    if deposit_request.status not in [
        DepositRequest.Status.PENDING,
        DepositRequest.Status.IN_REVIEW,
    ]:
        raise ValueError("Only pending or in-review deposits can be rejected.")

    deposit_request.status = DepositRequest.Status.REJECTED
    deposit_request.reviewed_by = staff_user
    deposit_request.reviewed_at = timezone.now()

    if staff_note:
        deposit_request.staff_note = staff_note

    deposit_request.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "staff_note",
            "updated_at",
        ]
    )

    create_notification(
        user=deposit_request.user,
        notification_type=Notification.NotificationType.DEPOSIT,
        title="Deposit Rejected",
        message=f"Your deposit request of {deposit_request.amount} has been rejected.",
        reference_table="deposit_requests",
        reference_id=deposit_request.id,
    )

    create_audit_log(
        actor_user=staff_user,
        action=AuditLog.ActionType.REJECT,
        target_table="deposit_requests",
        target_id=deposit_request.id,
        reason=staff_note,
    )

    return deposit_request


@transaction.atomic
def approve_withdrawal_request(withdrawal_request: WithdrawalRequest, staff_user, staff_note=None):
    withdrawal_request = WithdrawalRequest.objects.select_for_update().get(id=withdrawal_request.id)

    if withdrawal_request.status != WithdrawalRequest.Status.PENDING:
        raise ValueError("Only pending withdrawals can be approved.")

    wallet = UserWallet.objects.select_for_update().get(id=withdrawal_request.wallet_id)

    if wallet.balance < withdrawal_request.amount:
        raise ValueError("Insufficient wallet balance.")

    wallet.balance -= withdrawal_request.amount
    wallet.locked_balance += withdrawal_request.amount
    wallet.save(update_fields=["balance", "locked_balance", "updated_at"])

    withdrawal_request.status = WithdrawalRequest.Status.APPROVED
    withdrawal_request.reviewed_by = staff_user
    withdrawal_request.reviewed_at = timezone.now()

    if staff_note:
        withdrawal_request.staff_note = staff_note

    withdrawal_request.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "staff_note",
            "updated_at",
        ]
    )

    create_audit_log(
        actor_user=staff_user,
        action=AuditLog.ActionType.APPROVE,
        target_table="withdrawal_requests",
        target_id=withdrawal_request.id,
        reason=staff_note,
    )

    return withdrawal_request


@transaction.atomic
def reject_withdrawal_request(withdrawal_request: WithdrawalRequest, staff_user, staff_note=None):
    withdrawal_request = WithdrawalRequest.objects.select_for_update().get(id=withdrawal_request.id)

    if withdrawal_request.status not in [
        WithdrawalRequest.Status.PENDING,
        WithdrawalRequest.Status.APPROVED,
    ]:
        raise ValueError("Only pending or approved withdrawals can be rejected.")

    wallet = UserWallet.objects.select_for_update().get(id=withdrawal_request.wallet_id)

    if withdrawal_request.status == WithdrawalRequest.Status.APPROVED:
        wallet.locked_balance -= withdrawal_request.amount
        wallet.balance += withdrawal_request.amount
        wallet.save(update_fields=["balance", "locked_balance", "updated_at"])

    withdrawal_request.status = WithdrawalRequest.Status.REJECTED
    withdrawal_request.reviewed_by = staff_user
    withdrawal_request.reviewed_at = timezone.now()

    if staff_note:
        withdrawal_request.staff_note = staff_note

    withdrawal_request.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "staff_note",
            "updated_at",
        ]
    )

    create_audit_log(
        actor_user=staff_user,
        action=AuditLog.ActionType.REJECT,
        target_table="withdrawal_requests",
        target_id=withdrawal_request.id,
        reason=staff_note,
    )

    return withdrawal_request


@transaction.atomic
def mark_withdrawal_paid(withdrawal_request: WithdrawalRequest, staff_user, staff_note=None):
    withdrawal_request = WithdrawalRequest.objects.select_for_update().get(id=withdrawal_request.id)

    if withdrawal_request.status != WithdrawalRequest.Status.APPROVED:
        raise ValueError("Only approved withdrawals can be marked as paid.")

    wallet = UserWallet.objects.select_for_update().get(id=withdrawal_request.wallet_id)
    if wallet.locked_balance < withdrawal_request.amount:
        raise ValueError("Locked balance is not enough for this withdrawal.")

    balance_before = wallet.balance

    wallet.locked_balance -= withdrawal_request.amount
    wallet.save(update_fields=["locked_balance", "updated_at"])

    wallet_transaction = WalletTransaction.objects.create(
        wallet=wallet,
        user=withdrawal_request.user,
        transaction_type=WalletTransaction.TransactionType.WITHDRAWAL,
        amount=withdrawal_request.amount,
        balance_before=balance_before,
        balance_after=wallet.balance,
        reference_table="withdrawal_requests",
        reference_id=withdrawal_request.id,
        description="Withdrawal paid",
        created_by=staff_user,
    )

    withdrawal_request.status = WithdrawalRequest.Status.PAID
    withdrawal_request.paid_by = staff_user
    withdrawal_request.paid_at = timezone.now()

    if staff_note:
        withdrawal_request.staff_note = staff_note

    withdrawal_request.save(
        update_fields=[
            "status",
            "paid_by",
            "paid_at",
            "staff_note",
            "updated_at",
        ]
    )

    create_notification(
        user=withdrawal_request.user,
        notification_type=Notification.NotificationType.WITHDRAWAL,
        title="Withdrawal Paid",
        message=f"Your withdrawal of {withdrawal_request.amount} has been paid.",
        reference_table="withdrawal_requests",
        reference_id=withdrawal_request.id,
    )

    create_audit_log(
        actor_user=staff_user,
        action=AuditLog.ActionType.APPROVE,
        target_table="withdrawal_requests",
        target_id=withdrawal_request.id,
        reason=staff_note or "Withdrawal marked as paid.",
    )

    return withdrawal_request, wallet_transaction
