from django.core.management.base import BaseCommand

from accounts.models import User
from ledgers.models import ResultPeriod
from ledgers.services import enter_result_and_preview_settlement


class Command(BaseCommand):
    help = "Test closing period and entering result"

    def handle(self, *args, **options):
        admin_user = User.objects.filter(role="owner").first()

        if not admin_user:
            self.stdout.write(self.style.ERROR("No owner user found."))
            return

        result_period = ResultPeriod.objects.filter(code="JUNE01").first()

        if not result_period:
            self.stdout.write(self.style.ERROR("No JUNE01 result period found."))
            return

        batch = enter_result_and_preview_settlement(
            result_period=result_period,
            result_number="124",
            admin_user=admin_user,
        )

        self.stdout.write(self.style.SUCCESS("Result entered and settlement preview created."))
        self.stdout.write(f"Result Period: {batch.result_period.code}")
        self.stdout.write(f"Result Number: {batch.result_number}")
        self.stdout.write(f"Status: {batch.status}")