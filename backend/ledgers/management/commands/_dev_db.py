from django.core.management import call_command
from django.db import connection

from accounts.models import User


def ensure_dev_database_ready(stdout):
    """
    For local SQLite development, automatically run migrations if the DB file exists
    but the schema has not been created yet. This keeps test-only management commands
    usable without requiring an extra manual bootstrap step.
    """

    if connection.vendor != "sqlite":
        return

    existing_tables = set(connection.introspection.table_names())
    if "accounts_user" in existing_tables:
        _ensure_dev_owner_user(stdout)
        return

    stdout.write("Local SQLite database is not initialized. Running migrations...")
    call_command("migrate")
    _ensure_dev_owner_user(stdout)


def _ensure_dev_owner_user(stdout):
    if User.objects.filter(role=User.Role.OWNER).exists():
        return

    User.objects.create_superuser(
        phone="+95912345678",
        password="devowner123",
        name="Local Dev Owner",
        email="devowner@example.com",
    )
    stdout.write(
        "Created local SQLite dev owner user: +95912345678 / devowner123"
    )
