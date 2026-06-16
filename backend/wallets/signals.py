from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserWallet, SystemSetting


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_wallet(sender, instance, created, **kwargs):
    if created:
        UserWallet.objects.get_or_create(user=instance)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_settings_on_first_owner(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.role != "owner":
        return

    default_settings = [
        {
            "setting_key": "minimum_deposit",
            "setting_value": "1000",
            "description": "Minimum amount allowed for deposit request.",
        },
        {
            "setting_key": "minimum_withdrawal",
            "setting_value": "10000",
            "description": "Minimum amount allowed for withdrawal request.",
        },
        {
            "setting_key": "default_settlement_rate",
            "setting_value": "700",
            "description": "Default settlement rate used when creating ledgers.",
        },
        {
            "setting_key": "default_close_time",
            "setting_value": "15:00:00",
            "description": "Default closing time for result periods.",
        },
        {
            "setting_key": "maintenance_mode",
            "setting_value": "false",
            "description": "When 'true', a maintenance banner is shown to everyone.",
        },
        {
            "setting_key": "maintenance_message",
            "setting_value": "We're performing scheduled maintenance. Some features may be temporarily unavailable.",
            "description": "Message shown in the maintenance banner.",
        },
    ]

    for setting in default_settings:
        SystemSetting.objects.get_or_create(
            setting_key=setting["setting_key"],
            defaults={
                "setting_value": setting["setting_value"],
                "description": setting["description"],
                "updated_by": instance,
            },
        )