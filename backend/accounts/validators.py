from django.core.exceptions import ValidationError


def normalize_phone_parts(phone_country_code: str, phone_number: str) -> tuple[str, str, str]:
    country_code = (phone_country_code or "").strip().replace(" ", "")
    number = (phone_number or "").strip().replace(" ", "").replace("-", "")

    if not country_code:
        raise ValidationError("Phone country code is required.")

    if not country_code.startswith("+"):
        raise ValidationError("Phone country code must start with +.")

    country_digits = country_code[1:]
    if not country_digits.isdigit():
        raise ValidationError("Phone country code must contain digits only after +.")

    if not 1 <= len(country_digits) <= 4:
        raise ValidationError("Phone country code must be 1 to 4 digits.")

    if not number:
        raise ValidationError("Phone number is required.")

    if not number.isdigit():
        raise ValidationError("Phone number must contain digits only.")

    if number.startswith("0"):
        number = number[1:]

    if not 7 <= len(number) <= 12:
        raise ValidationError("Phone number must be between 7 and 12 digits.")

    full_phone = f"+{country_digits}{number}"
    return f"+{country_digits}", number, full_phone
