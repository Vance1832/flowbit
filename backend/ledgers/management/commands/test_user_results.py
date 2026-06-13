from django.core.management.base import BaseCommand

from accounts.models import User
from ledgers.services import get_user_visible_results


class Command(BaseCommand):
    help = "Test user visible result list"

    def handle(self, *args, **options):
        user = User.objects.filter(role="owner").first()

        if not user:
            self.stdout.write(self.style.ERROR("No owner user found."))
            return

        results = get_user_visible_results(user)

        self.stdout.write(self.style.SUCCESS("User visible results:"))

        for result in results:
            line = f"{result['result_date']} | {result['result_number']}"

            if "status" in result:
                line += f" | {result['status']}"

            self.stdout.write(line)
            