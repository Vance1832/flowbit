"""Render a user-facing receipt PDF.

Only the fields the proposal (§9) allows are shown: receipt no, name, result
date, date & time, status, numbers + amounts, and total. Internal data (user id,
ledger split, wallet balance, payment source, etc.) is never included.
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


PRIMARY = colors.HexColor("#107859")
MUTED = colors.HexColor("#5d6f67")
FOREGROUND = colors.HexColor("#10231c")


def _format_amount(value):
    return f"MMK {value:,.0f}" if value == value.to_integral() else f"MMK {value:,.2f}"


def build_receipt_pdf(receipt) -> bytes:
    buffer = BytesIO()
    width, height = A5
    pdf = canvas.Canvas(buffer, pagesize=A5, pageCompression=1)
    pdf.setTitle(receipt.receipt_no)

    left = 18 * mm
    right = width - 18 * mm
    y = height - 22 * mm

    # Header
    pdf.setFillColor(PRIMARY)
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(left, y, "Flowbit")
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(left, y - 6 * mm, "Ledger & Settlement System")
    pdf.setFillColor(FOREGROUND)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawRightString(right, y, "RECEIPT")

    y -= 14 * mm
    pdf.setStrokeColor(colors.HexColor("#dde6df"))
    pdf.setLineWidth(1)
    pdf.line(left, y, right, y)

    # Meta rows
    name = receipt.user.name if receipt.user_id else "—"
    result_date = (
        receipt.result_period.result_date.strftime("%Y-%m-%d")
        if receipt.result_period_id and receipt.result_period.result_date
        else "—"
    )
    date_time = receipt.paid_at.strftime("%Y-%m-%d %H:%M") if receipt.paid_at else "—"

    rows = [
        ("Receipt No", receipt.receipt_no),
        ("Name", name),
        ("Result Date", result_date),
        ("Date & Time", date_time),
        ("Status", receipt.get_status_display()),
    ]

    y -= 9 * mm
    for label, value in rows:
        pdf.setFont("Helvetica", 9)
        pdf.setFillColor(MUTED)
        pdf.drawString(left, y, label)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.setFillColor(FOREGROUND)
        pdf.drawRightString(right, y, str(value))
        y -= 7 * mm

    # Numbers table
    y -= 3 * mm
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(left, y, "NUMBER")
    pdf.drawRightString(right, y, "AMOUNT")
    y -= 3 * mm
    pdf.line(left, y, right, y)
    y -= 7 * mm

    items = list(receipt.items.all().order_by("number_code"))
    for item in items:
        if y < 30 * mm:  # simple overflow guard onto a new page
            pdf.showPage()
            y = height - 22 * mm
        pdf.setFillColor(FOREGROUND)
        pdf.setFont("Helvetica", 11)
        pdf.drawString(left, y, item.number_code)
        pdf.drawRightString(right, y, _format_amount(item.amount))
        y -= 7 * mm

    # Total
    y -= 2 * mm
    pdf.line(left, y, right, y)
    y -= 9 * mm
    pdf.setFont("Helvetica-Bold", 12)
    pdf.setFillColor(FOREGROUND)
    pdf.drawString(left, y, "Total")
    pdf.setFillColor(PRIMARY)
    pdf.drawRightString(right, y, _format_amount(receipt.total_amount))

    # Footer
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 7)
    pdf.drawCentredString(
        width / 2,
        16 * mm,
        "This receipt confirms the numbers and amounts you paid for. Keep it for your records.",
    )

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()
