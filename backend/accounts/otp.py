"""Password-reset OTP generation and verification."""

import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from .models import OtpCode

CODE_LENGTH = 6
OTP_TTL = timedelta(minutes=10)
MAX_ATTEMPTS = 5


def generate_code() -> str:
    """A cryptographically-random zero-padded 6-digit code."""
    return f"{secrets.randbelow(10 ** CODE_LENGTH):0{CODE_LENGTH}d}"


def create_otp(phone: str, purpose: str) -> str:
    """Issue a fresh OTP for ``phone``/``purpose`` and return the plaintext code.

    Any earlier unconsumed codes for the same phone+purpose are invalidated so
    only the newest one can be used.
    """
    OtpCode.objects.filter(
        phone=phone, purpose=purpose, consumed_at__isnull=True
    ).update(consumed_at=timezone.now())

    code = generate_code()
    OtpCode.objects.create(
        phone=phone,
        purpose=purpose,
        code_hash=make_password(code),
        expires_at=timezone.now() + OTP_TTL,
    )
    return code


def verify_otp(phone: str, code: str, purpose: str) -> bool:
    """Validate and consume the latest usable OTP for ``phone``/``purpose``.

    Increments the attempt counter on a wrong code; consumes the OTP on
    success so it can't be reused.
    """
    otp = (
        OtpCode.objects.filter(phone=phone, purpose=purpose, consumed_at__isnull=True)
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


# Backwards-compatible helpers for the password-reset flow.
def create_password_reset_otp(phone: str) -> str:
    return create_otp(phone, OtpCode.Purpose.PASSWORD_RESET)


def verify_password_reset_otp(phone: str, code: str) -> bool:
    return verify_otp(phone, code, OtpCode.Purpose.PASSWORD_RESET)
