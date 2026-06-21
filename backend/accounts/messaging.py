"""Pluggable OTP delivery.

``OTP_DELIVERY_CHANNELS`` is an ordered list of channels to try until one
succeeds — e.g. ``"sms,email"`` sends by SMS and falls back to email. Supported
channels:

- ``console`` — logs the code (development default; no credentials needed).
- ``sms``     — Twilio REST API (needs TWILIO_* settings).
- ``email``   — Django email framework (needs the user's email + EMAIL_* settings).
"""

import base64
import logging
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger("flowbit.otp")

TWILIO_MESSAGES_URL = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


class OtpDeliveryError(Exception):
    """Raised when an OTP could not be delivered on any configured channel."""


def _reset_message(code: str) -> str:
    return (
        f"Your Flowbit password reset code is {code}. It expires in 10 minutes. "
        "If you didn't request this, ignore this message."
    )


def _verification_message(code: str) -> str:
    return (
        f"Your Flowbit phone verification code is {code}. It expires in 10 minutes."
    )


def _send_console(phone: str | None, email: str | None, message: str) -> None:
    logger.info("[OTP/console] phone=%s email=%s :: %s", phone, email, message)


def _send_twilio_sms(phone: str | None, message: str) -> None:
    sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    sender = getattr(settings, "TWILIO_FROM_NUMBER", "")
    if not (sid and token and sender):
        raise OtpDeliveryError("Twilio is not configured (TWILIO_* settings missing).")
    if not phone:
        raise OtpDeliveryError("No phone number available for SMS delivery.")

    data = urllib.parse.urlencode({"To": phone, "From": sender, "Body": message}).encode()
    request = urllib.request.Request(
        TWILIO_MESSAGES_URL.format(sid=sid), data=data, method="POST"
    )
    credentials = base64.b64encode(f"{sid}:{token}".encode()).decode()
    request.add_header("Authorization", f"Basic {credentials}")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()
    except urllib.error.URLError as error:
        raise OtpDeliveryError(f"Twilio request failed: {error}") from error


def _send_email(email: str | None, message: str) -> None:
    if not email:
        raise OtpDeliveryError("No email address available for email delivery.")
    try:
        send_mail(
            subject="Flowbit password reset code",
            message=message,
            from_email=None,  # uses DEFAULT_FROM_EMAIL
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as error:  # SMTP/connection errors
        raise OtpDeliveryError(f"Email send failed: {error}") from error


def _deliver(phone: str | None, email: str | None, message: str) -> str:
    """Deliver ``message`` over the first working channel; return that channel.

    Raises ``OtpDeliveryError`` only if every configured channel fails.
    """
    channels = getattr(settings, "OTP_DELIVERY_CHANNELS", ["console"])
    last_error: Exception | None = None

    for channel in channels:
        try:
            if channel == "console":
                _send_console(phone, email, message)
            elif channel == "sms":
                _send_twilio_sms(phone, message)
            elif channel == "email":
                _send_email(email, message)
            else:
                logger.warning("Unknown OTP delivery channel: %s", channel)
                continue
            return channel
        except OtpDeliveryError as error:
            last_error = error
            logger.warning("OTP channel '%s' failed: %s", channel, error)

    raise OtpDeliveryError(
        f"All OTP delivery channels failed ({', '.join(channels) or 'none configured'})."
    ) from last_error


def send_password_reset_otp(phone: str | None, email: str | None, code: str) -> str:
    return _deliver(phone, email, _reset_message(code))


def send_phone_verification_otp(phone: str | None, email: str | None, code: str) -> str:
    return _deliver(phone, email, _verification_message(code))
