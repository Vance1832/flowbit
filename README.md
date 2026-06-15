# Flowbit

[![CI](https://github.com/Vance1832/flowbit/actions/workflows/ci.yml/badge.svg)](https://github.com/Vance1832/flowbit/actions/workflows/ci.yml)

Flowbit is a Number-Based Ledger and Settlement Management System. Users top up a
wallet, submit paid number records (000–999) for an open **result period**, and are
credited after an admin reviews and **approves** the settlement (it is never
automatic, and is blocked until the company reserve covers any shortfall). Staff
handle deposit/withdrawal approvals, and owners run result periods, ledgers,
settlements, and the company reserve.

This is a **monorepo** combining the API and the web client:

| Path        | Stack                                   | Role                                   |
| ----------- | --------------------------------------- | -------------------------------------- |
| `backend/`  | Django 6 · DRF · SimpleJWT · PostgreSQL | REST API, business logic, persistence  |
| `frontend/` | Next.js 16 · React 19 · Tailwind 4 · TS | Role-based web app (user/staff/owner)  |

## Roles

| Role               | Can access                                                              |
| ------------------ | ---------------------------------------------------------------------- |
| `user` / `vip_user`| Wallet, submit numbers, receipts, results, notifications, profile      |
| `staff`            | Deposit & withdrawal request approvals, staff dashboard                 |
| `admin` / `owner`  | Everything above + result periods, ledgers, settlements, reserve, audit |

The frontend routes each role to its own area (`/user/*`, `/staff/*`, `/` owner console)
based on the authenticated user's role.

## Features

- **Wallet & flows** — deposits and withdrawals via a staff-reviewed approval
  pipeline; balance/locked-balance accounting in atomic transactions.
- **Number submission** — 000–999 grid, quick-input (`124 1000`), and the **R**
  rearrange feature, with an editable preview before payment.
- **Result periods & ledgers** — one result number per period; priority ledger
  allocation; capacity checks before payment.
- **Settlement** — admin-reviewed preview and approval; **owner void / re-entry**
  with full payout reversal and reserve refund; company-reserve shortfall guard.
- **Analytics dashboard** — collected-vs-settlement, 14-day cashflow, and P&L KPIs.
- **Reporting** — receipt **PDF** download and **CSV exports** (audit, deposits,
  withdrawals, settlements/P&L, company reserve).
- **System settings** — adjustable minimums and close time, with audit logging.
- **Security** — JWT auth, role-based access, API rate limiting, audit trail, and
  production security headers (HSTS, secure cookies, SSL redirect) when `DEBUG=False`.
- **UX** — light/dark themes, responsive (mobile drawer) consoles, accessible nav.

## Architecture

```
Browser ──▶ Next.js (app router, :3000)
                │  fetch + JWT (Bearer) via lib/api/client.ts
                ▼
            Django REST API (:8000, /api/*)
                │
                ▼
            PostgreSQL
```

Auth is JWT: the client logs in at `/api/auth/login/`, stores the access/refresh
tokens in `localStorage`, attaches `Authorization: Bearer <access>` to every request,
and silently refreshes via `/api/auth/refresh/` on `401`.

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 14+ (a running instance with a database for Flowbit)

## Quick start

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # then edit DB_* and SECRET_KEY
python manage.py migrate
python manage.py createsuperuser   # optional: an owner-capable admin
python manage.py runserver 127.0.0.1:8000
```

Backend env vars (`backend/.env`):

| Var                   | Purpose                                  | Example                         |
| --------------------- | ---------------------------------------- | ------------------------------- |
| `SECRET_KEY`          | Django secret                            | `change-me-in-production`       |
| `DEBUG`               | Debug mode                               | `True`                          |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` | PostgreSQL connection | `flowbit` / `postgres` / ... |
| `CORS_ALLOWED_ORIGINS`| Comma-separated allowed origins          | `http://localhost:3000`         |

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_BASE_URL
npm run dev
```

Frontend env vars (`frontend/.env.local`):

| Var                        | Purpose                | Example                  |
| -------------------------- | ---------------------- | ------------------------ |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the API    | `http://127.0.0.1:8000`  |

Open http://localhost:3000 and log in. Owners land on the operations console,
staff on the staff dashboard, users on their wallet dashboard.

## API reference

The full endpoint catalogue lives in [`backend/docs/API.md`](backend/docs/API.md).
All routes are prefixed with `/api/` and (except auth/register) require a Bearer token.

| Area            | Base path             | Highlights                                                       |
| --------------- | --------------------- | --------------------------------------------------------------- |
| Auth            | `/api/auth/`          | `login/`, `refresh/`                                            |
| Accounts        | `/api/accounts/`      | `register/`, `me/`, `admin/users/`                             |
| Wallets         | `/api/wallets/`       | `me/`, `transactions/`, `deposits/`, `withdrawals/`, admin ops |
| Receipts        | `/api/receipts/`      | submit numbers, list/detail receipts                            |
| Ledgers         | `/api/ledgers/`       | result periods, results, admin ledgers & numbers                |
| Settlements     | `/api/settlements/`   | settlement batches, approve                                     |
| Company         | `/api/company/`       | reserve wallets, transactions, cashouts                         |
| Notifications   | `/api/notifications/` | list, mark read / read-all                                      |

## Testing & CI

```bash
# Backend (Django) — runs on an in-memory SQLite DB
cd backend && python manage.py test

# Frontend (Next.js)
cd frontend
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest unit tests
npm run build       # production build
```

`.github/workflows/ci.yml` runs all of the above on every push and pull request
to `main`.

## Repository layout

```
flowbit/
├── backend/          Django project (config/ + per-domain apps)
│   ├── config/       settings, urls, asgi/wsgi
│   ├── accounts/     custom User model, auth, admin user mgmt
│   ├── wallets/      wallets, transactions, deposit/withdrawal flows
│   ├── receipts/     number submissions and receipts
│   ├── ledgers/      result periods, results, ledgers
│   ├── settlements/  payout settlement batches
│   ├── company/      company reserve wallets & cashouts
│   ├── notifications/ user notifications
│   ├── audit/        audit logging
│   └── docs/API.md   API contract
└── frontend/         Next.js app
    ├── app/          routes: (owner) / staff / user / login / register
    ├── components/   screens, layout shells, providers, ui primitives
    └── lib/api/      typed API client (one module per domain)
```

## Notes

- This repo was assembled from two source repositories (`flowbit-backend`,
  `flowbit-frontend`) via `git subtree`, so the full commit history of both is
  preserved in `git log`.
- `backend/.env`, `frontend/.env.local`, virtualenvs, `node_modules`, and the local
  database are git-ignored — copy the `.example` files and fill them in locally.
