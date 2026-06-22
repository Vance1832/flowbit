# Flowbit — operations & deployment notes

Practical notes for running Flowbit's backend in production. See `HANDOFF.md`
for the broader project state and the pre-deploy checklist.

## Environment variables

| Variable | Purpose | Production value |
|----------|---------|------------------|
| `SECRET_KEY` | Django secret | strong, ≥ 50 chars, **not** the insecure default (enforced when `DEBUG=False`) |
| `DEBUG` | Debug mode | `False` — also auto-enables HSTS, secure cookies, SSL redirect |
| `ALLOWED_HOSTS` | Allowed hosts | your domain(s), comma-separated |
| `CORS_ALLOWED_ORIGINS` | Frontend origins | the deployed frontend URL(s) |
| `DB_ENGINE` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` | Database | PostgreSQL (`django.db.backends.postgresql`) |
| `OTP_DELIVERY_CHANNELS` | Password-reset OTP delivery | Ordered, comma-separated channels tried until one succeeds: `console` (default, logs the code), `sms` (Twilio), `email`. For SMS with email fallback: `sms,email`. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | Twilio SMS | required when `sms` is a channel |
| `EMAIL_BACKEND` / `DEFAULT_FROM_EMAIL` / `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` / `EMAIL_USE_TLS` | Email | required when `email` is a channel (console backend in dev) |
| `SECURE_SSL_REDIRECT` / `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` | Hardening | default on when `DEBUG=False`; override only behind a TLS-terminating proxy |

## Scheduled jobs

Pick whichever fits your host:

- **System cron** (Linux/VPS) — [`deploy/crontab.example`](../deploy/crontab.example).
- **No host decided / CI-driven** — [`.github/workflows/scheduled-jobs.yml`](../../.github/workflows/scheduled-jobs.yml)
  runs the commands on GitHub's scheduler. It needs the DB reachable from
  GitHub runners and the repo secrets listed at the top of that file. GitHub
  cron is UTC and best-effort (5-minute minimum), which is fine here because
  `close_expired_ledgers` is only status upkeep.

The commands:

- **`close_expired_ledgers`** — every minute. Flips ledgers past their
  `close_at` to `closed`. Submission already refuses out-of-window bets, so
  this only keeps the stored status accurate; it is idempotent and audited.
- **`fetch_lotto_latest`** — on the 1st and 16th (Thai draw days), through the
  afternoon announcement window. Pulls the latest official draw from the GLO
  API and cross-checks the 3D number against the historical archive. Idempotent.

Run once, manually, to seed historical data:

- **`import_lotto_archive`** — backfills every Thai draw since 2007 from the
  `vicha-w/thai-lotto-archive` repo into `LotteryDraw`. Idempotent (`--dry-run`
  and `--since YEAR` supported). Reference data only — it never touches betting
  or settlement.

### TLS / CA certificates for the lottery fetchers

`import_lotto_archive` and `fetch_lotto_latest` make outbound HTTPS calls
(GitHub, glo.or.th) with certificate verification **on**. Standard Linux hosts
have system CA roots and need no extra config. On a machine missing them (e.g.
the python.org build on macOS), point Python at a CA bundle:

```
SSL_CERT_FILE=/etc/ssl/cert.pem python manage.py import_lotto_archive
```

## Pre-deploy checklist

- Strong `SECRET_KEY`, `DEBUG=False`, real `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS`.
- Switch to PostgreSQL; run `python manage.py migrate`.
- Move uploaded media (avatars) to object storage (S3/GCS).
- Install the cron jobs above; confirm `import_lotto_archive` has been run once.
- Reset dev passwords and remove the DEMO01 / test data.
