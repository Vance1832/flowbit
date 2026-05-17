from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from company.models import CompanyWallet
from ledgers.models import ResultPeriod
from receipts.models import Receipt, ReceiptItem
from settlements.models import SettlementBatch, SettlementItem, SettlementItemSource


def calculate_total_collected(result_period):
    return (
        Receipt.objects
        .filter(result_period=result_period, status=Receipt.Status.PAID)
        .aggregate_total()
    )


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

    Rules:
    - One result number per result period.
    - Result number must be 000-999.
    - Settlement preview can only be created once unless previous one is voided.
    - User wallet is NOT credited yet.
    - Admin must approve settlement later.
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

    total_settlement = Decimal("0.00")

    # If multiple ledgers exist, use weighted/simple approach:
    # for now use the first ledger settlement rate from the result period.
    first_ledger = result_period.ledgers.order_by("priority_order", "id").first()

    if not first_ledger:
        raise ValueError("No ledger found for this result period.")

    settlement_rate = first_ledger.settlement_rate

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

    return batch