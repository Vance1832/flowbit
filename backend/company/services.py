from django.db import transaction
from django.utils import timezone

from audit.models import AuditLog
from audit.services import create_audit_log
from .models import CompanyWallet, CompanyWalletTransaction, CompanyCashoutRequest


@transaction.atomic
def add_company_reserve(wallet: CompanyWallet, amount, admin_user, description=None):
    wallet = CompanyWallet.objects.select_for_update().get(id=wallet.id)

    before = wallet.balance
    wallet.balance += amount
    wallet.save(update_fields=["balance", "updated_at"])

    tx = CompanyWalletTransaction.objects.create(
        company_wallet=wallet,
        transaction_type=CompanyWalletTransaction.TransactionType.RESERVE_DEPOSIT,
        amount=amount,
        balance_before=before,
        balance_after=wallet.balance,
        description=description or "Company reserve deposit",
        created_by=admin_user,
    )

    create_audit_log(
        actor_user=admin_user,
        action=AuditLog.ActionType.RESERVE_DEPOSIT,
        target_table="company_wallet_transactions",
        target_id=tx.id,
        new_values={
            "company_wallet_id": wallet.id,
            "amount": str(amount),
            "balance_before": str(before),
            "balance_after": str(wallet.balance),
        },
        reason=description or "Company reserve deposit added.",
    )

    return wallet, tx


@transaction.atomic
def approve_company_cashout(cashout: CompanyCashoutRequest, owner_user, note=None):
    cashout = CompanyCashoutRequest.objects.select_for_update().get(id=cashout.id)

    if cashout.status != CompanyCashoutRequest.Status.PENDING:
        raise ValueError("Only pending cashout requests can be approved.")

    cashout.status = CompanyCashoutRequest.Status.APPROVED
    cashout.approved_by = owner_user
    cashout.approved_at = timezone.now()

    if note:
        cashout.admin_note = note

    cashout.save(update_fields=["status", "approved_by", "approved_at", "admin_note", "updated_at"])

    create_audit_log(
        actor_user=owner_user,
        action=AuditLog.ActionType.CASHOUT,
        target_table="company_cashout_requests",
        target_id=cashout.id,
        old_values={"status": CompanyCashoutRequest.Status.PENDING},
        new_values={
            "status": cashout.status,
            "approved_at": cashout.approved_at.isoformat() if cashout.approved_at else None,
            "admin_note": cashout.admin_note,
        },
        reason=note or "Company cashout approved.",
    )

    return cashout


@transaction.atomic
def mark_company_cashout_paid(cashout: CompanyCashoutRequest, owner_user, note=None):
    cashout = CompanyCashoutRequest.objects.select_for_update().get(id=cashout.id)

    if cashout.status != CompanyCashoutRequest.Status.APPROVED:
        raise ValueError("Only approved cashouts can be marked as paid.")

    wallet = CompanyWallet.objects.select_for_update().get(id=cashout.company_wallet_id)

    if wallet.balance < cashout.amount:
        raise ValueError("Insufficient company wallet balance.")

    before = wallet.balance
    wallet.balance -= cashout.amount
    wallet.save(update_fields=["balance", "updated_at"])

    wallet_tx = CompanyWalletTransaction.objects.create(
        company_wallet=wallet,
        transaction_type=CompanyWalletTransaction.TransactionType.COMPANY_CASHOUT,
        amount=cashout.amount,
        balance_before=before,
        balance_after=wallet.balance,
        reference_table="company_cashout_requests",
        reference_id=cashout.id,
        description=note or "Company cashout paid",
        created_by=owner_user,
    )

    cashout.status = CompanyCashoutRequest.Status.PAID
    cashout.paid_at = timezone.now()

    if note:
        cashout.admin_note = note

    cashout.save(update_fields=["status", "paid_at", "admin_note", "updated_at"])

    create_audit_log(
        actor_user=owner_user,
        action=AuditLog.ActionType.CASHOUT,
        target_table="company_cashout_requests",
        target_id=cashout.id,
        old_values={"status": CompanyCashoutRequest.Status.APPROVED},
        new_values={
            "status": cashout.status,
            "paid_at": cashout.paid_at.isoformat() if cashout.paid_at else None,
            "admin_note": cashout.admin_note,
            "wallet_transaction_id": wallet_tx.id,
        },
        reason=note or "Company cashout marked as paid.",
    )

    return cashout
