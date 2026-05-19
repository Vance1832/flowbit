from django.db import transaction
from django.utils import timezone

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

    CompanyWalletTransaction.objects.create(
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
    return cashout