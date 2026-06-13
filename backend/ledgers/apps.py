from django.apps import AppConfig


class LedgersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ledgers"

    def ready(self):
        import ledgers.signals