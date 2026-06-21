"""Password-reset OTP generation and verification."""

import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from .models import PasswordResetOTP

CODE_LENGTH = 6
OTP_TTL = timedelta(minutes=10)
MAX_ATTEMPTS = 5


def generate_code() -> str:
    """A cryptographically-random zero-padded 6-digit code."""
    return f"{secrets.randbelow(10 ** CODE_LENGTH):0{CODE_LENGTH}d}"


def create_password_reset_otp(phone: str) -> str:
    """Issue a fresh OTP for ``phone`` and return the plaintext code.

    Any earlier unconsumed codes for the phone are invalidated so only the
    newest one can be used.
    """
    PasswordResetOTP.objects.filter(phone=phone, consumed_at__isnull=True).update(
        consumed_at=timezone.now()
    )

    code = generate_code()
    PasswordResetOTP.objects.create(
        phone=phone,
        code_hash=make_password(code),
        expires_at=timezone.now() + OTP_TTL,
    )
    return code


def verify_password_reset_otp(phone: str, code: str) -> bool:
    """Validate and consume the latest usable OTP for ``phone``.

    Increments the attempt counter on a wrong code; consumes the OTP on
    success so it can't be reused.
    """
    otp = (
        PasswordResetOTP.objects.filter(phone=phone, consumed_at__isnull=True)
        .order_by("-created_at")
        .first()
    )

    if otp is None or not otp.is_usable(MAX_ATTEMPTS):
        return False

    if not check_password(code, otp.code_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        return False

    otp.consumed_at = timezone.now()
    otp.save(update_fields=["consumed_at"])
    return True
