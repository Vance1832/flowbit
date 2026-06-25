"""Channels middleware that authenticates a WebSocket from a JWT access token.

The SPA keeps its access token in localStorage and sends it on the
`?token=` query parameter of the WebSocket URL (browsers can't set custom
headers on the WS handshake). We validate it with SimpleJWT and resolve the
user onto the connection scope.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _user_from_token(raw_token):
    from rest_framework_simplejwt.exceptions import TokenError
    from rest_framework_simplejwt.settings import api_settings
    from rest_framework_simplejwt.tokens import AccessToken

    try:
        token = AccessToken(raw_token)
        user_id = token.payload.get(api_settings.USER_ID_CLAIM)
    except TokenError:
        return AnonymousUser()

    if user_id is None:
        return AnonymousUser()

    User = get_user_model()
    try:
        return User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        token = query.get("token", [None])[0]
        scope["user"] = await _user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
