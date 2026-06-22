import logging

from celery import shared_task

from .messaging import (
    OtpDeliveryError,
    send_email_verification_otp,
    send_password_reset_otp,
    send_phone_verification_otp,
)

logger = logging.getLogger("flowbit.otp")


@shared_task(name="accounts.send_otp")
def send_otp_task(kind: str, phone: str | None, email: str | None, code: str) -> None:
    """Deliver an OTP off the request path. Failures are logged, never raised,
    so a delivery problem can't surface a 500 or leak account existence."""
    try:
        if kind == "password_reset":
            send_password_reset_otp(phone, email, code)
        elif kind == "phone_verification":
            send_phone_verification_otp(phone, email, code)
        elif kind == "email_verification":
            send_email_verification_otp(email, code)
        else:
            logger.warning("Unknown OTP kind: %s", kind)
    except OtpDeliveryError:
        logger.exception("OTP delivery failed (%s)", kind)
