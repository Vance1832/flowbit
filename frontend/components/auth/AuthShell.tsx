"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { FlowbitMark } from "@/components/FlowbitLogo";

export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-app-bg)] px-6 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] items-center justify-center">
        <section className="w-full rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-8 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-9">
          <Link href="/" className="inline-flex items-center gap-3">
            <FlowbitMark className="h-11 w-11 shrink-0" />
            <span>
              <span className="block text-xl font-semibold tracking-tight text-[var(--color-foreground)]">
                Flowbit
              </span>
              <span className="block text-sm text-[var(--color-muted-foreground)]">
                Wallet &amp; Ledger System
              </span>
            </span>
          </Link>

          <div className="mt-5 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
            Secure Access
          </div>

          <div className="mt-6">{children}</div>

          <div className="mt-8 border-t border-[var(--color-border)] pt-5">
            {footer}
          </div>
        </section>
      </div>
    </div>
  );
}
