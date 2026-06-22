"""Idempotency for money-mutating endpoints.

A client sends an ``Idempotency-Key`` header; the first request runs and its
response is cached against (user, key). Retries with the same key return the
cached response instead of creating a duplicate. The unique (user, key)
constraint also makes concurrent duplicates safe: only one request can claim
the key; the loser gets the cached result or a 409 while it's in flight.
"""

from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.response import Response

from .models import IdempotencyKey


def _jsonable(data):
    return data if isinstance(data, (dict, list)) else None


def idempotent_response(request, produce_response):
    """Run ``produce_response()`` at most once per (user, Idempotency-Key)."""
    key = request.headers.get("Idempotency-Key")
    user = request.user if request.user.is_authenticated else None
    if not key or user is None:
        return produce_response()

    try:
        # Savepoint so a duplicate-key IntegrityError doesn't poison the
        # surrounding request transaction.
        with transaction.atomic():
            record = IdempotencyKey.objects.create(user=user, key=key)
    except IntegrityError:
        existing = IdempotencyKey.objects.filter(user=user, key=key).first()
        if existing and existing.status_code:
            return Response(existing.response_body, status=existing.status_code)
        return Response(
            {"detail": "A request with this idempotency key is already in progress."},
            status=status.HTTP_409_CONFLICT,
        )

    try:
        response = produce_response()
    except Exception:
        record.delete()  # let the client retry with the same key
        raise

    if 200 <= response.status_code < 300:
        record.status_code = response.status_code
        record.response_body = _jsonable(response.data)
        record.save(update_fields=["status_code", "response_body"])
    else:
        record.delete()  # don't cache failures
    return response


class IdempotentCreateMixin:
    """Makes a ListCreateAPIView's POST idempotent via the Idempotency-Key header."""

    def create(self, request, *args, **kwargs):
        parent_create = super().create
        return idempotent_response(request, lambda: parent_create(request, *args, **kwargs))
