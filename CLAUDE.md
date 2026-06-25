# Flowbit — working notes for Claude Code

> Open new sessions **from this directory** (`/Users/khantzayar/flowbit`), not the
> old `flowbit-backend` repo. This monorepo is the source of truth.
> Full project state & resume guide: **[HANDOFF.md](HANDOFF.md)**.

## What this is
Flowbit = Number-Based Ledger & Settlement Management System (Myanmar wallet +
number-betting). Monorepo: `backend/` (Django 6 + DRF, SQLite in dev /
Postgres-ready) and `frontend/` (Next.js 16, React 19, Tailwind 4, TS). Remote:
https://github.com/Vance1832/flowbit

Backend apps: `accounts` (auth/OTP/verification), `wallets` (deposits/
withdrawals/idempotency/system settings), `ledgers` (periods/ledgers/capacity),
`receipts` (number submission), `settlements`, `company` (reserve), `audit`,
`notifications`, `lottery` (Thai 3D import/fetch/history), `compliance`
(responsible-gambling + KYC/AML). Async via **Celery** (Redis broker, eager in
dev); cache/throttle via **Redis** (`REDIS_URL`, local-mem fallback).

## Run it
```bash
# backend (terminal 1)
cd backend && source venv/bin/activate && python manage.py runserver 127.0.0.1:8000
# frontend (terminal 2)
cd frontend && npm run dev     # http://localhost:3000
# OR the full stack (web + celery worker/beat + postgres + redis):
docker compose up --build
```
> Working in a `.claude/worktrees/*` copy? It has no `venv`/`node_modules`.
> For checks, use the main repo's interpreter (`/Users/khantzayar/flowbit/backend/venv/bin/python`)
> and hardlink deps (`cp -al /Users/khantzayar/flowbit/frontend/node_modules ./node_modules`),
> then remove them before committing. Outbound HTTPS (lottery fetch) needs
> `SSL_CERT_FILE=/etc/ssl/cert.pem` on this Mac.

## Test accounts (dev only — password `Flowbit123!`)
- Owner `+95912345678` · Admin `+9591234567` · Staff `+959123456` · User `+959777777777`
- Open period **DEMO01** exists; the User wallet is funded for testing.

## Checks before committing
```bash
cd backend && SECRET_KEY=ci-test-secret-key-0123456789-0123456789-0123456789-abcdef \
  DEBUG=False SECURE_SSL_REDIRECT=False DB_ENGINE=django.db.backends.sqlite3 \
  DB_NAME=":memory:" python manage.py test          # 168 tests
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
```
Live API docs: `/api/schema/`, `/api/docs/` (Swagger), `/api/redoc/`.

## Gotchas (learned the hard way)
- **Never `rm -rf .next` while the dev server is running** — it corrupts Turbopack
  and causes 500s. Stop the server first.
- Login is rate-limited to ~10/min per IP (DRF throttle).
- Theme is **cookie-driven and server-rendered** (`lib/theme.ts`, root layout).
  Don't reintroduce an inline `<script>` for it. A const exported from a
  `"use client"` module becomes a client-reference on the server — keep shared
  constants in plain modules.
- Backend tests run on SQLite with `DEBUG=False`; pass `SECURE_SSL_REDIRECT=False`
  so the test client isn't 301-redirected.

## Conventions
- Money/business logic lives in each app's `services.py`, wrapped in
  `@transaction.atomic`; every state change writes an `audit` log entry.
- New owner/admin endpoints use `IsAdminOwner` / `IsOwner` from `accounts.permissions`.
- Frontend API calls go through `lib/api/*` (typed) → `apiRequest` in `lib/api/client.ts`.
- Add a test for every new endpoint/flow; keep CI green.
- **i18n (EN/Burmese):** user-facing text goes through `useTranslations()` →
  `t("ns.key")`; add the key to BOTH `messages/en.ts` + `messages/my.ts` (`my` is
  type-checked against `en`). Cookie-driven, no `[locale]` route. **The whole app
  is bilingual** — user app, staff surface, console shell, and every owner screen.
  For any new screen, follow the documented pattern in
  **HANDOFF.md → "i18n / Burmese"**.
