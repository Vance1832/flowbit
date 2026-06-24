# Flowbit — Project Handoff / Resume Guide

This document captures the full state so work can resume in a fresh session with
no context loss. **All code is committed and pushed** to
https://github.com/Vance1832/flowbit (branch `main`) — nothing depends on chat
history.

## How to resume in a new context window
1. Open a new Claude Code session **in `/Users/khantzayar/flowbit`** (the monorepo),
   not the old `flowbit-backend` folder.
2. `CLAUDE.md` (auto-loaded) + this file give the full picture.
3. `git log --oneline` shows the complete history; `git status` should be clean.

## Architecture
- **Monorepo**: `backend/` (Django 6 · DRF · SimpleJWT · SQLite in dev / Postgres-ready)
  and `frontend/` (Next.js 16 · React 19 · Tailwind 4 · TypeScript).
- Auth: JWT (access/refresh in localStorage), silent refresh on 401.
- Roles: owner, admin, staff, user (the `vip_user` role was removed). Frontend
  areas: `/console` (owner/admin), `/staff/*`, `/user/*`, public `/`, `/login`,
  `/register`, `/forgot-password`.
- Auth hardened: refresh-token **rotation + blacklist**; `/api/auth/logout/`
  revokes the refresh token. Async work runs on **Celery** (Redis broker; eager
  in dev/CI). Cache/throttle use **Redis** (`REDIS_URL`; local-mem fallback).

## Run / test / build
See `CLAUDE.md`. Backend suite = **135 tests** (SQLite, `DEBUG=False`).
CI (`.github/workflows/ci.yml`) runs backend tests + frontend typecheck/lint/test/
build on every push/PR. `docker compose up` runs the full stack.

## Scheduled jobs
`close_expired_ledgers`, `ensure_scheduled_periods`, `fetch_lotto_latest`,
`reconcile_finances`, `purge_idempotency_keys`, `verify_audit_chain` run via
**Celery beat** (when a worker+beat run) or host cron
(`backend/deploy/crontab.example`). The
`.github/workflows/scheduled-jobs.yml` cron is **disabled** (manual-dispatch
only) — it needs a GitHub-reachable DB + repo secrets; don't re-enable the
`schedule:` block until those exist (it was emailing run-failures otherwise).

## Test accounts (DEV ONLY)
Password for all: `Flowbit123!`
| Role | Phone |
|------|-------|
| Owner | `+95912345678` |
| Admin | `+9591234567` |
| Staff | `+959123456` |
| User  | `+959777777777` |
- Open result period **DEMO01** + a ledger exist; the User wallet is funded
  (~MMK 2,144,000) so number submission/receipts work.
- These passwords + the DEMO01 data were set for testing — **reset before real use.**

## Features implemented
- Monorepo merge (preserved history) + landing page + role-based consoles.
- Dark mode (cookie-driven, server-rendered, no flash), responsive mobile drawers,
  accessibility pass (aria-current, labeled charts/buttons).
- Flowbit logo mark + color-theory palette (green primary + teal-cyan accent).
- Number submission §7: grid + quick-input (`124 1000`) + R rearrange + editable
  preview.
- Wallet deposit/withdrawal flows (atomic, audited).
- Settlement: preview, admin approval, **owner void/re-entry** (reverses payouts +
  refunds reserve), company-reserve shortfall guard.
- Analytics dashboard (collected vs settlement, 14-day cashflow, P&L KPIs).
- Reporting: receipt **PDF** + **CSV exports** (audit, deposits, withdrawals,
  settlements/P&L, company reserve).
- System Settings (adjustable minimums/close-time, audited) incl. **maintenance
  mode** (global banner via public `/api/wallets/system-status/`).
- Notifications + **broadcast announcements** (owner/admin → audience).
- Security: API rate limiting; production headers (HSTS/secure cookies/SSL
  redirect) auto-on when `DEBUG=False`; strong-SECRET_KEY guard.
- Accounts: self-service **change password**; **profile picture upload** for all
  roles; owner/admin **Profile page** at `/profile`.

## Added since the initial handoff (merged PRs #1–#5)
- **Time-based ledger close** (window-enforced bets + auto-close) and **audit
  log pagination**.
- **Thai 3D auto-results** (`lottery` app): `import_lotto_archive` (since 2007),
  `fetch_lotto_latest` (official GLO, cross-checked), one-tap confirm in result
  entry, and a user-facing **3D History** page.
- **OTP**: self-service password reset + **phone & email verification**;
  pluggable delivery (`OTP_DELIVERY_CHANNELS` — console dev default, Twilio SMS +
  email fallback). Country-code selector on login/register/reset.
- **UI redesign**: `PageHero`/`StatTile` primitives across user + owner/staff.
- **Infra**: Redis cache, Celery, Docker (`Dockerfile` + `docker-compose.yml`,
  gunicorn, WhiteNoise, S3 media via `USE_S3`), `/healthz/`, JWT
  rotation/blacklist, **reconciliation** job + DB non-negative-money constraints.
- **Observability** (structured logging + Sentry via `SENTRY_DSN`) and **API
  docs** (drf-spectacular).
- **Compliance** (`compliance` app): responsible-gambling daily deposit/bet
  limits + self-exclusion; **KYC** submit/review with withdrawal-gating above
  `kyc_withdrawal_threshold` (a System Setting).
- **Idempotency keys** on deposit/withdrawal/number-submission (`Idempotency-Key`
  header).
- **Deposit proof upload** (PR #8): `DepositRequest.proof_image` is a real
  `ImageField` upload (users attach a payment screenshot; staff/owner view it
  inline). All image uploads (proof, KYC, avatar) are now **Pillow-validated**
  (decode + format allowlist), not just trusting the `Content-Type` header.
- **Login 2FA**: optional OTP second factor for owner/admin. Login returns a
  `two_factor_required` challenge; `/api/auth/login/2fa/verify/` exchanges the
  code for tokens. Toggle at `/api/auth/2fa/` (owner/admin only), surfaced on
  the owner/admin Profile page. Reuses the OTP infra (`LOGIN_2FA` purpose).
- **Automated period scheduling**: a singleton `PeriodSchedule` (template,
  daily close time, active weekdays, days-ahead horizon) auto-opens upcoming
  result periods + ledgers. Idempotent `ensure_scheduled_periods` command/Celery
  task (beat 00:05 daily); owner UI on the Ledger Templates screen with a
  "Run now" action (`/api/ledgers/admin/period-schedule/` + `/run/`).
- **Audit log append-only + tamper-evident**: `AuditLog.objects` blocks
  update/delete (instance + bulk); maintenance uses the explicit
  `AuditLog.unsafe_objects` escape hatch. Each entry is HMAC-`SECRET_KEY`
  hash-chained (`prev_hash`/`entry_hash`) so DB-level edits/deletes are
  detectable. `verify_audit_chain` command/Celery task + owner "Verify
  integrity" button (`GET /api/audit/admin/logs/verify/`). Note: rotating
  `SECRET_KEY` invalidates the chain (like sessions/tokens).

## Not done / next ideas
- **i18n / Burmese** (large; touches every screen).
- **Real-time notifications** (WebSocket/push or email digests).
- **2D betting is complete** (backend + user betting + owner result entry +
  combined Draw History). Nothing 2D-specific outstanding.

## 2D betting — backend (done)
A `ResultPeriod.bet_type` (`3d` default / `2d`) drives the number length
end-to-end via `ResultPeriod.number_length` (2 vs 3). 2D ledgers seed 100
numbers (00–99) instead of 1000; submission, R-permutations, capacity, and
settlement all respect the period's length; result entry for 2D matches the
official `LotteryDraw.two_down`. 2-digit codes fit the existing `max_length=3`
fields, so the only schema change was the `bet_type` column. The **user submit
screen** (PR 2) now has a 3D/2D toggle that fetches the period for the chosen
type (`getUserCurrentResultPeriod(betType)`) and drives a length-aware grid /
quick-input / R-expansion (100 cells for 2D). **Owner result entry** (PR 3) is
now 2/3-box-aware and matches `two_down` for 2D, and the **period create form**
has a bet-type picker — so the whole 2D loop (create → bet → enter result →
settle) works in the UI. The user **Draw History** page (route still
`/user/3d-history`) shows official 3D + 2D side by side.
- Policy values to set (mechanism built): `kyc_withdrawal_threshold`, default
  RG limits, real `OTP_DELIVERY_CHANNELS` + provider creds.

## Production checklist (before real deploy)
- Strong `SECRET_KEY`, `DEBUG=False`, real `ALLOWED_HOSTS`/`CORS_ALLOWED_ORIGINS`.
- PostgreSQL (`DB_ENGINE=django.db.backends.postgresql`), `REDIS_URL`,
  `CELERY_BROKER_URL`; run a Celery worker + beat.
- `USE_S3` + AWS vars for media; `USE_X_FORWARDED_PROTO` behind a TLS proxy.
- Set `OTP_DELIVERY_CHANNELS` + provider creds; set `kyc_withdrawal_threshold`.
- Install scheduling (host cron or Celery beat); reset dev passwords, remove
  DEMO01 / test data. See `backend/docs/operations.md`.

## Dev gotchas
- Don't `rm -rf .next` while the frontend dev server runs (corrupts Turbopack → 500s).
- Login throttle ~10/min per IP.
- Theme constants must live in a plain module (not a `"use client"` file) so the
  server layout can read the cookie correctly.
