from notifications.services import create_notification
from notifications.models import Notification
from decimal import Decimal

from audit.models import AuditLog
from audit.services import create_audit_log
from django.db import transaction
from django.utils import timezone

from company.models import CompanyWallet, CompanyWalletTransaction
from ledgers.models import ResultPeriod
from receipts.models import Receipt, ReceiptItem
from settlements.models import SettlementBatch, SettlementItem, SettlementItemSource
from wallets.models import UserWallet, WalletTransaction


def get_total_collected(result_period):
    receipts = Receipt.objects.filter(
        result_period=result_period,
        status=Receipt.Status.PAID,
    )

    total = sum((receipt.total_amount for receipt in receipts), Decimal("0.00"))
    return total


@transaction.atomic
def create_settlement_preview(result_period: ResultPeriod, result_number: str, admin_user):
    """
    Creates settlement preview for one result period.
    User wallet is NOT credited yet.
    Admin must approve settlement later.
    """

    result_number = str(result_number).strip()

    if len(result_number) != 3 or not result_number.isdigit():
        raise ValueError("Result number must be exactly 3 digits.")

    existing_batch = SettlementBatch.objects.filter(
        result_period=result_period
    ).exclude(
        status=SettlementBatch.Status.VOIDED
    ).first()

    if existing_batch:
        raise ValueError("Settlement preview already exists for this result period.")

    matched_items = ReceiptItem.objects.filter(
        receipt__result_period=result_period,
        receipt__status=Receipt.Status.PAID,
        number_code=result_number,
    ).select_related("receipt", "receipt__user")

    total_collected = get_total_collected(result_period)

    settlement_items_by_user = {}

    for item in matched_items:
        user_id = item.receipt.user_id

        if user_id not in settlement_items_by_user:
            settlement_items_by_user[user_id] = {
                "user": item.receipt.user,
                "matched_amount": Decimal("0.00"),
                "sources": [],
            }

        settlement_items_by_user[user_id]["matched_amount"] += item.amount
        settlement_items_by_user[user_id]["sources"].append(item)

    first_ledger = result_period.ledgers.order_by("priority_order", "id").first()

    if not first_ledger:
        raise ValueError("No ledger found for this result period.")

    settlement_rate = first_ledger.settlement_rate

    total_settlement = Decimal("0.00")

    for data in settlement_items_by_user.values():
        total_settlement += data["matched_amount"] * settlement_rate

    final_profit_loss = total_collected - total_settlement

    reserve_required = Decimal("0.00")

    if final_profit_loss < 0:
        reserve_required = abs(final_profit_loss)

    company_wallet = CompanyWallet.objects.first()
    company_balance = company_wallet.balance if company_wallet else Decimal("0.00")

    if reserve_required > 0 and company_balance < reserve_required:
        status = SettlementBatch.Status.FUNDING_REQUIRED
    else:
        status = SettlementBatch.Status.PREVIEWED

    batch = SettlementBatch.objects.create(
        result_period=result_period,
        result_number=result_number,
        total_collected=total_collected,
        total_settlement=total_settlement,
        company_reserve_required=reserve_required,
        company_reserve_used=Decimal("0.00"),
        final_profit_loss=final_profit_loss,
        status=status,
        previewed_by=admin_user,
        previewed_at=timezone.now(),
    )

    for data in settlement_items_by_user.values():
        settlement_amount = data["matched_amount"] * settlement_rate

        settlement_item = SettlementItem.objects.create(
            settlement_batch=batch,
            user=data["user"],
            number_code=result_number,
            total_matched_amount=data["matched_amount"],
            settlement_rate=settlement_rate,
            settlement_amount=settlement_amount,
            status=SettlementItem.Status.PREVIEWED,
        )

        for source_item in data["sources"]:
            SettlementItemSource.objects.create(
                settlement_item=settlement_item,
                receipt_item=source_item,
                matched_amount=source_item.amount,
            )

    result_period.result_number = result_number
    result_period.result_entered_by = admin_user
    result_period.result_entered_at = timezone.now()
    result_period.status = ResultPeriod.Status.SETTLEMENT_PREVIEWED
    result_period.save(
        update_fields=[
            "result_number",
            "result_entered_by",
            "result_entered_at",
            "status",
            "updated_at",
        ]
    )

    create_audit_log(
        actor_user=admin_user,
        action=AuditLog.ActionType.SETTLEMENT,
        target_table="settlement_batches",
        target_id=batch.id,
        new_values={
            "result_period_id": result_period.id,
            "result_number": result_number,
            "status": batch.status,
            "total_collected": str(batch.total_collected),
            "total_settlement": str(batch.total_settlement),
            "company_reserve_required": str(batch.company_reserve_required),
        },
        reason="Settlement preview created.",
    )

    return batch


@transaction.atomic
def approve_settlement(batch: SettlementBatch, admin_user):
    """
    Approves and pays a settlement batch.
    If reserve is required, company wallet must have enough balance.
    """

    batch = SettlementBatch.objects.select_for_update().get(id=batch.id)

    previous_status = batch.status

    if batch.status == SettlementBatch.Status.PAID:
        raise ValueError("Settlement batch is already paid.")

    if batch.status == SettlementBatch.Status.VOIDED:
        raise ValueError("Voided settlement batch cannot be approved.")

    company_wallet = CompanyWallet.objects.select_for_update().first()

    if batch.company_reserve_required > 0:
        if not company_wallet:
            raise ValueError("Company wallet does not exist.")

        if company_wallet.balance < batch.company_reserve_required:
            raise ValueError(
                f"Insufficient company reserve. Required: {batch.company_reserve_required}, "
                f"Available: {company_wallet.balance}"
            )

        reserve_before = company_wallet.balance
        company_wallet.balance -= batch.company_reserve_required
        company_wallet.save(update_fields=["balance", "updated_at"])

        CompanyWalletTransaction.objects.create(
            company_wallet=company_wallet,
            transaction_type=CompanyWalletTransaction.TransactionType.SETTLEMENT_FUNDING,
            amount=batch.company_reserve_required,
            balance_before=reserve_before,
            balance_after=company_wallet.balance,
            reference_table="settlement_batches",
            reference_id=batch.id,
            description=f"Settlement funding for {batch.result_period.code}",
            created_by=admin_user,
        )

        batch.company_reserve_used = batch.company_reserve_required

    settlement_items = batch.items.select_related("user")

    for item in settlement_items:
        if item.status == SettlementItem.Status.PAID:
            continue

        wallet = UserWallet.objects.select_for_update().get(user=item.user)

        balance_before = wallet.balance
        wallet.balance += item.settlement_amount
        wallet.save(update_fields=["balance", "updated_at"])

        wallet_tx = WalletTransaction.objects.create(
            wallet=wallet,
            user=item.user,
            transaction_type=WalletTransaction.TransactionType.SETTLEMENT_CREDIT,
            amount=item.settlement_amount,
            balance_before=balance_before,
            balance_after=wallet.balance,
            reference_table="settlement_items",
            reference_id=item.id,
            description=f"Settlement credit for {batch.result_period.code}",
            created_by=admin_user,
        )

        item.wallet_transaction = wallet_tx
        item.status = SettlementItem.Status.PAID
        item.paid_at = timezone.now()
        item.save(update_fields=["wallet_transaction", "status", "paid_at"])

        create_notification(
            user=item.user,
            notification_type=Notification.NotificationType.SETTLEMENT,
            title="Settlement Credited",
            message=f"Your settlement of {item.settlement_amount} for {batch.result_period.code} has been credited.",
            reference_table="settlement_items",
            reference_id=item.id,
        )

    batch.status = SettlementBatch.Status.PAID
    batch.approved_by = admin_user
    batch.approved_at = timezone.now()
    batch.paid_at = timezone.now()
    batch.save(
        update_fields=[
            "status",
            "approved_by",
            "approved_at",
            "paid_at",
            "company_reserve_used",
        ]
    )

    batch.result_period.status = ResultPeriod.Status.SETTLED
    batch.result_period.save(update_fields=["status", "updated_at"])

    create_audit_log(
        actor_user=admin_user,
        action=AuditLog.ActionType.SETTLEMENT,
        target_table="settlement_batches",
        target_id=batch.id,
        old_values={
            "status": previous_status,
            "company_reserve_used": "0.00",
        },
        new_values={
            "status": batch.status,
            "company_reserve_used": str(batch.company_reserve_used),
            "paid_at": batch.paid_at.isoformat() if batch.paid_at else None,
            "approved_at": batch.approved_at.isoformat() if batch.approved_at else None,
        },
        reason="Settlement approved and paid.",
    )

    return batch
