FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Build tools + libpq for psycopg; removed from the final layer to keep it small.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake static assets into the image (WhiteNoise serves them at runtime).
# A throwaway key keeps DEBUG=True so the strong-SECRET_KEY guard is skipped.
RUN SECRET_KEY=build-only DEBUG=True python manage.py collectstatic --noinput

EXPOSE 8000

# Migrations are run as a release/compose step, not in the image CMD.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
