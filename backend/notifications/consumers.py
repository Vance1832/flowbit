"""WebSocket consumer that pushes notification events to a single user.

Each authenticated connection joins a per-user group. `services.push_to_user`
fans an event into that group, and `notify` relays it to the browser, which
then refreshes its notification list (and badge).
"""

from channels.generic.websocket import AsyncJsonWebsocketConsumer


def user_group_name(user_id) -> str:
    return f"notifications_user_{user_id}"


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            # 4401 = application-level "unauthorized" (4000–4999 is app-defined).
            await self.close(code=4401)
            return

        self.group_name = user_group_name(user.id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        group_name = getattr(self, "group_name", None)
        if group_name is not None:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def notify(self, event):
        """Relay a group event (type="notify") to the connected client."""
        await self.send_json({"event": "notification", "unread": event.get("unread")})
