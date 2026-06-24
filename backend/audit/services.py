from .hashing import GENESIS_HASH, compute_entry_hash
from .models import AuditLog


def verify_audit_chain():
    """Walk the audit chain in id order and report any tampering.

    A row is flagged if its stored ``entry_hash`` doesn't match a recompute, or
    its ``prev_hash`` doesn't link to the preceding row — which is what a
    silent edit or deletion produces. Returns ``{ok, count, broken_ids}``.
    """
    prev = GENESIS_HASH
    broken = []
    count = 0

    for row in AuditLog.objects.order_by("id").iterator():
        count += 1
        expected = compute_entry_hash(row.prev_hash, row._content())
        if row.prev_hash != prev or row.entry_hash != expected:
            broken.append(row.id)
        # Continue from the stored hash so each break is reported once, not
        # cascaded onto every following row.
        prev = row.entry_hash

    return {"ok": not broken, "count": count, "broken_ids": broken}


def create_audit_log(
    actor_user,
    action,
    target_table=None,
    target_id=None,
    old_values=None,
    new_values=None,
    ip_address=None,
    user_agent=None,
    reason=None,
):
    return AuditLog.objects.create(
        actor_user=actor_user,
        action=action,
        target_table=target_table,
        target_id=target_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent,
        reason=reason,
    )
