"""Shared image-upload validation.

Trusting the client-supplied ``Content-Type`` header is not enough: an
attacker can label an arbitrary (or malicious) payload as ``image/png``. We
decode the upload with Pillow to confirm it is a genuine, non-corrupt image of
an allowed format before it is ever stored or served.

Raises ``django.core.exceptions.ValidationError`` on failure, which DRF's
``validate_<field>`` machinery converts into a 400 field error automatically.
Callers that don't go through a serializer (e.g. ``AvatarUploadView``) can
catch it and shape their own response.
"""

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

# 5 MB default — matches the historical avatar cap.
DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024

# Pillow format names (img.format) we accept for user-supplied images.
ALLOWED_IMAGE_FORMATS = {"PNG", "JPEG", "GIF", "WEBP"}


def validate_image_upload(file, max_bytes=DEFAULT_MAX_IMAGE_BYTES):
    """Validate ``file`` is a real, in-size, allowed-format image.

    Returns the file unchanged so it can be used as a serializer field
    validator. Leaves the file's read position at 0 so Django can save it.
    """
    if file is None:
        raise ValidationError("No file was uploaded.")

    if file.size > max_bytes:
        mb = max_bytes // (1024 * 1024)
        raise ValidationError(f"Image must be {mb} MB or smaller.")

    try:
        file.seek(0)
        image = Image.open(file)
        image_format = (image.format or "").upper()
        # verify() decodes the image data and raises on truncation/corruption;
        # it does NOT trust the content-type header.
        image.verify()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        raise ValidationError("File must be a valid image.")
    finally:
        # verify() consumes the stream; rewind so the storage backend can read it.
        file.seek(0)

    if image_format not in ALLOWED_IMAGE_FORMATS:
        allowed = ", ".join(sorted(ALLOWED_IMAGE_FORMATS))
        raise ValidationError(f"Unsupported image type. Allowed formats: {allowed}.")

    return file
