import Link from "next/link";

import {
  ArrowsIcon,
  FileIcon,
  ListIcon,
  SparkIcon,
  VaultIcon,
  WalletIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const features = [
  {
    icon: WalletIcon,
    title: "Wallet & instant payouts",
    description:
      "Top up, track every transaction, and receive automatic payouts the moment results are entered.",
  },
  {
    icon: ListIcon,
    title: "Live result periods",
    description:
      "Submit numbers against open periods and watch them lock, close, and settle in real time.",
  },
  {
    icon: FileIcon,
    title: "Verifiable receipts",
    description:
      "Every submission produces a numbered receipt you can audit from your account at any time.",
  },
  {
    icon: ArrowsIcon,
    title: "Deposit & withdrawal flow",
    description:
      "Request deposits and withdrawals with a transparent, staff-reviewed approval pipeline.",
  },
  {
    icon: VaultIcon,
    title: "Reserve-backed ledgers",
    description:
      "Operators run ledgers and settlements against a managed company reserve for full accountability.",
  },
  {
    icon: SparkIcon,
    title: "Real-time notifications",
    description:
      "Stay on top of approvals, results, and account activity with notifications as they happen.",
  },
];

const steps = [
  {
    step: "01",
    title: "Create your account",
    description: "Register with your phone number in seconds and sign in securely.",
  },
  {
    step: "02",
    title: "Fund your wallet",
    description: "Submit a deposit request and start with a verified, ready-to-use balance.",
  },
  {
    step: "03",
    title: "Submit & get paid",
    description: "Pick your numbers for an open period and receive automatic payouts on results.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-app-bg)] text-[var(--color-foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-sm">
              <SparkIcon className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight">Flowbit</span>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Wallet &amp; Ledger System
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="h-10 w-10" />
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-muted)]"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-10 items-center rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-strong)]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-[var(--color-primary-soft)] blur-3xl" />
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            Live wallet &amp; results platform
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            The wallet built for numbers, results, and instant payouts
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--color-muted-foreground)] sm:text-lg">
            Flowbit gives players a fast, transparent wallet and gives operators the
            ledgers, settlements, and reserve controls to run it all with confidence.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center rounded-xl bg-[var(--color-primary)] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-strong)]"
            >
              Create your account
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-background)] px-6 text-sm font-semibold text-[var(--color-foreground)] shadow-sm transition-colors hover:bg-[var(--color-surface-muted)]"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything the flow needs, in one place
          </h2>
          <p className="mt-3 text-base leading-7 text-[var(--color-muted-foreground)]">
            From the first deposit to the final settlement — a single system that players
            and operators can both trust.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Up and running in three steps
            </h2>
            <p className="mt-3 text-base leading-7 text-[var(--color-muted-foreground)]">
              No friction, no waiting — just sign up and start.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
              >
                <span className="text-sm font-semibold text-[var(--color-primary)]">
                  {item.step}
                </span>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-primary)] px-8 py-14 text-center text-white shadow-[0_24px_60px_rgba(16,120,89,0.28)]">
          <h2 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to put your wallet to work?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
            Join Flowbit and experience a wallet, results, and payout flow built for speed
            and transparency.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center rounded-xl bg-[var(--color-surface-raised)] px-6 text-sm font-semibold text-[var(--color-primary-strong)] shadow-sm transition-colors hover:bg-white/90"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center rounded-xl border border-white/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-[var(--color-muted-foreground)] sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
              <SparkIcon className="h-4 w-4" />
            </span>
            <span className="font-semibold text-[var(--color-foreground)]">Flowbit</span>
          </div>
          <p>© {new Date().getFullYear()} Flowbit. Wallet &amp; Ledger System.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="transition-colors hover:text-[var(--color-foreground)]">
              Log in
            </Link>
            <Link href="/register" className="transition-colors hover:text-[var(--color-foreground)]">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
