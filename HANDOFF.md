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
- Roles: owner, admin, staff, user (+vip_user). Frontend areas: `/console` (owner/
  admin), `/staff/*`, `/user/*`, public `/` landing, `/login`, `/register`.

## Run / test / build
See `CLAUDE.md`. Backend suite = **57 tests** (run on SQLite, `DEBUG=False`).
CI (`.github/workflows/ci.yml`) runs backend tests + frontend typecheck/lint/test/
build on every push/PR.

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

## Not done / blocked / next ideas
- **OTP/2FA + phone/email password reset (§3/§14)** — needs an SMS/email provider
  (e.g. Twilio/SendGrid) + credentials. Backend OTP mechanism not built yet.
- **Deployment config** (Dockerfile / Vercel + Render) — needs hosting choice.
- Possible polish: remove-avatar option + cropping; profit-cashout (§12) likely
  overlaps existing company cashout; deeper long-text/responsive QA.

## Production checklist (before real deploy)
- Set a strong `SECRET_KEY`, `DEBUG=False`, real `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS`.
- Switch DB to PostgreSQL (`DB_ENGINE=django.db.backends.postgresql`).
- Move media (avatars) to object storage (S3/GCS); set `USE_X_FORWARDED_PROTO` if
  behind a TLS proxy.
- Reset the dev passwords and remove DEMO01 / test data.

## Dev gotchas
- Don't `rm -rf .next` while the frontend dev server runs (corrupts Turbopack → 500s).
- Login throttle ~10/min per IP.
- Theme constants must live in a plain module (not a `"use client"` file) so the
  server layout can read the cookie correctly.
