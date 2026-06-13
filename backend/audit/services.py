from .models import AuditLog


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
