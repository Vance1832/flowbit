from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CompanyWallet


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_company_wallet(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.role != "owner":
        return

    CompanyWallet.objects.get_or_create(
        name="Main Company Reserve",
        defaults={"balance": 0},
    )