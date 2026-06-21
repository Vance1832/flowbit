"""Pluggable OTP delivery.

The default ``console`` backend logs the message — suitable for development,
where no SMS/email provider credentials exist. Swap ``OTP_SMS_BACKEND`` (and
add a branch here) to wire a real provider such as Twilio later, without
touching the OTP flow itself.
"""

import logging

from django.conf import settings

logger = logging.getLogger("flowbit.otp")


def send_sms(phone: str, message: str) -> None:
    backend = getattr(settings, "OTP_SMS_BACKEND", "console")

    if backend == "console":
        logger.info("[OTP/console] SMS to %s: %s", phone, message)
        return

    # A real provider plugs in here (e.g. Twilio). Fail loudly on misconfig so
    # a typo can't silently drop verification messages.
    raise NotImplementedError(f"Unsupported OTP_SMS_BACKEND: {backend!r}")


def send_password_reset_otp(phone: str, code: str) -> None:
    send_sms(
        phone,
        f"Your Flowbit password reset code is {code}. "
        "It expires in 10 minutes. If you didn't request this, ignore this message.",
    )
