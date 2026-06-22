from django.db import connection
from django.http import JsonResponse


def healthz(request):
    """Liveness + readiness probe: 200 when the DB is reachable, else 503."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        return JsonResponse({"status": "error"}, status=503)
    return JsonResponse({"status": "ok"})
