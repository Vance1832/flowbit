"""Tamper-evident hash chain for the audit log.

Each entry stores ``prev_hash`` (the previous entry's ``entry_hash``) and its own
``entry_hash = HMAC-SHA256(SECRET_KEY, prev_hash | content)``. Because the chain
is keyed with ``SECRET_KEY``, someone with direct database access cannot edit or
delete a row and silently recompute valid downstream hashes — verification will
flag the break. (Rotating ``SECRET_KEY`` invalidates the chain, the same way it
invalidates sessions/tokens.)
"""

import hashlib
import hmac
import json

from django.conf import settings

# prev_hash of the very first entry in the chain.
GENESIS_HASH = ""


def entry_content(
    *,
    actor_user_id,
    action,
    target_table,
    target_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    reason,
):
    """The canonical, hashable content of an audit entry (excludes pk/time)."""
    return {
        "actor_user_id": actor_user_id,
        "action": action,
        "target_table": target_table,
        "target_id": target_id,
        "old_values": old_values,
        "new_values": new_values,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "reason": reason,
    }


def compute_entry_hash(prev_hash: str, content: dict) -> str:
    payload = json.dumps(content, sort_keys=True, default=str, separators=(",", ":"))
    message = f"{prev_hash}|{payload}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), message, hashlib.sha256).hexdigest()
