from decimal import Decimal
from itertools import permutations

from django.db import transaction
from django.utils import timezone

from ledgers.models import Ledger, LedgerNumber
from wallets.models import UserWallet, WalletTransaction
from .models import Receipt, ReceiptItem, PaidNumberAllocation, RGeneratedGroup, RGeneratedItem


def normalize_number_code(number_code: str) -> str:
    number_code = str(number_code).strip()

    if len(number_code) != 3 or not number_code.isdigit():
        raise ValueError("Number must be exactly 3 digits.")

    return number_code


def generate_r_numbers(number_code: str) -> list[str]:
    number_code = normalize_number_code(number_code)

    generated = sorted(set("".join(p) for p in permutations(number_code)))

    return generated


def generate_receipt_no(result_period) -> str:
    count = Receipt.objects.filter(result_period=result_period).count() + 1
    return f"FB-{result_period.code}-{count:06d}"


def get_active_ledgers(result_period, now=None):
    """Ledgers currently accepting bets: OPEN *and* inside their time window.

    A ledger's ``open_at``/``close_at`` are the authoritative betting window.
    A ledger whose ``close_at`` has passed no longer accepts bets even if its
    ``status`` is still ``open`` (e.g. the scheduled auto-close has not run yet).
    """
    now = now or timezone.now()
    return (
        Ledger.objects
        .filter(
            result_period=result_period,
            status=Ledger.Status.OPEN,
            open_at__lte=now,
            close_at__gt=now,
        )
        .order_by("priority_order", "id")
    )


def check_total_capacity(result_period, number_code: str, now=None) -> Decimal:
    number_code = normalize_number_code(number_code)
    now = now or timezone.now()

    ledger_numbers = LedgerNumber.objects.filter(
        ledger__result_period=result_period,
        ledger__status=Ledger.Status.OPEN,
        ledger__open_at__lte=now,
        ledger__close_at__gt=now,
        number_code=number_code,
    )

    total_available = sum((ln.remaining_amount for ln in ledger_numbers), Decimal("0.00"))
    return total_available


@transaction.atomic
def create_paid_receipt(user, result_period, raw_items):
    """
    raw_items example:
    [
        {"number_code": "124", "amount": "3000"},
        {"number_code": "124", "amount": "2000"},
        {"number_code": "124", "amount": "1000", "use_r": True},
    ]
    """

    result_period = result_period.__class__.objects.select_for_update().get(id=result_period.id)

    if result_period.status != "open":
        raise ValueError("This result period is not open.")

    # Pin a single timestamp for the whole transaction so the betting window and
    # every capacity check below are evaluated consistently.
    now = timezone.now()

    active_ledgers = list(get_active_ledgers(result_period, now=now))
    if not active_ledgers:
        raise ValueError("Betting is closed for this period.")

    expanded_items = []

    for item in raw_items:
        number_code = normalize_number_code(item["number_code"])
        amount = Decimal(str(item["amount"]))
        use_r = bool(item.get("use_r", False))

        if amount <= 0:
            raise ValueError("Amount must be greater than zero.")

        if use_r:
            for generated_number in generate_r_numbers(number_code):
                expanded_items.append({
                    "number_code": generated_number,
                    "amount": amount,
                    "is_generated_by_r": True,
                    "source_input": f"{number_code} R",
                    "source_number": number_code,
                })
        else:
            expanded_items.append({
                "number_code": number_code,
                "amount": amount,
                "is_generated_by_r": False,
                "source_input": None,
                "source_number": None,
            })

    total_amount = sum((item["amount"] for item in expanded_items), Decimal("0.00"))

    wallet = UserWallet.objects.select_for_update().get(user=user)

    if wallet.balance < total_amount:
        raise ValueError("Insufficient wallet balance.")

    # Check capacity before creating receipt/payment
    for item in expanded_items:
        available = check_total_capacity(result_period, item["number_code"], now=now)
        if available < item["amount"]:
            raise ValueError(
                f"Number {item['number_code']} has only {available} available."
            )

    balance_before = wallet.balance
    wallet.balance -= total_amount
    wallet.save(update_fields=["balance", "updated_at"])

    wallet_transaction = WalletTransaction.objects.create(
        wallet=wallet,
        user=user,
        transaction_type=WalletTransaction.TransactionType.NUMBER_PAYMENT,
        amount=total_amount,
        balance_before=balance_before,
        balance_after=wallet.balance,
        description="Paid number submission",
        created_by=user,
    )

    receipt = Receipt.objects.create(
        receipt_no=generate_receipt_no(result_period),
        user=user,
        result_period=result_period,
        total_amount=total_amount,
        status=Receipt.Status.PAID,
        paid_at=timezone.now(),
    )

    wallet_transaction.reference_table = "receipts"
    wallet_transaction.reference_id = receipt.id
    wallet_transaction.save(update_fields=["reference_table", "reference_id"])

    r_groups = {}

    for item in expanded_items:
        receipt_item = ReceiptItem.objects.create(
            receipt=receipt,
            number_code=item["number_code"],
            amount=item["amount"],
            is_generated_by_r=item["is_generated_by_r"],
            source_input=item["source_input"],
        )

        if item["is_generated_by_r"]:
            key = item["source_input"]

            if key not in r_groups:
                generated_numbers = generate_r_numbers(item["source_number"])
                group_total = Decimal(str(item["amount"])) * Decimal(len(generated_numbers))

                r_groups[key] = RGeneratedGroup.objects.create(
                    receipt=receipt,
                    source_number=item["source_number"],
                    source_text=item["source_input"],
                    amount_per_number=item["amount"],
                    generated_count=len(generated_numbers),
                    total_amount=group_total,
                )

            RGeneratedItem.objects.create(
                group=r_groups[key],
                receipt_item=receipt_item,
                number_code=item["number_code"],
                amount=item["amount"],
            )

        remaining_to_allocate = item["amount"]
        allocation_order = 1

        for ledger in active_ledgers:
            if remaining_to_allocate <= 0:
                break

            ledger_number = (
                LedgerNumber.objects
                .select_for_update()
                .get(ledger=ledger, number_code=item["number_code"])
            )

            if ledger_number.remaining_amount <= 0:
                continue

            allocated_amount = min(remaining_to_allocate, ledger_number.remaining_amount)

            PaidNumberAllocation.objects.create(
                receipt_item=receipt_item,
                ledger=ledger,
                ledger_number=ledger_number,
                number_code=item["number_code"],
                allocated_amount=allocated_amount,
                allocation_order=allocation_order,
            )

            ledger_number.used_amount += allocated_amount
            ledger_number.remaining_amount -= allocated_amount
            ledger_number.save(update_fields=["used_amount", "remaining_amount", "updated_at"])

            remaining_to_allocate -= allocated_amount
            allocation_order += 1

        if remaining_to_allocate > 0:
            raise ValueError(f"Could not fully allocate number {item['number_code']}.")

    return receipt
