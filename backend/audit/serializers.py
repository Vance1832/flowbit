import json

from rest_framework import serializers

from .models import AuditLog


TARGET_LABELS = {
    "deposit_requests": "Deposit Request",
    "withdrawal_requests": "Withdrawal Request",
    "result_periods": "Result Period",
    "ledgers": "Ledger",
    "settlement_batches": "Settlement Batch",
    "company_wallet_transactions": "Company Wallet",
    "company_wallets": "Company Wallet",
    "users": "User",
}


def _friendly_target(value):
    if not value:
        return "—"
    return TARGET_LABELS.get(value, value.replace("_", " ").title())


def _json_string(value):
    if value in (None, ""):
        return ""
    if isinstance(value, str):
        return value
    return json.dumps(value, default=str, ensure_ascii=False)


class AuditLogSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    action = serializers.SerializerMethodField()
    action_label = serializers.CharField(source="get_action_display", read_only=True)
    target = serializers.SerializerMethodField()
    target_id = serializers.SerializerMethodField()
    reason = serializers.SerializerMethodField()
    time = serializers.DateTimeField(source="created_at", format="%Y-%m-%d %H:%M")
    ip_address = serializers.SerializerMethodField()
    user_agent = serializers.SerializerMethodField()
    old_values = serializers.SerializerMethodField()
    new_values = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "role",
            "action",
            "action_label",
            "target",
            "target_id",
            "reason",
            "time",
            "ip_address",
            "user_agent",
            "old_values",
            "new_values",
        )

    def get_actor(self, obj):
        return obj.actor_user.name if obj.actor_user else "System"

    def get_role(self, obj):
        if not obj.actor_user:
            return "System"
        return (obj.actor_user.role or "").replace("_", " ").title() or "System"

    def get_action(self, obj):
        return (obj.action or "").upper()

    def get_target(self, obj):
        return _friendly_target(obj.target_table)

    def get_target_id(self, obj):
        return "" if obj.target_id is None else str(obj.target_id)

    def get_reason(self, obj):
        return obj.reason or ""

    def get_ip_address(self, obj):
        return obj.ip_address or ""

    def get_user_agent(self, obj):
        return obj.user_agent or ""

    def get_old_values(self, obj):
        return _json_string(obj.old_values)

    def get_new_values(self, obj):
        return _json_string(obj.new_values)
