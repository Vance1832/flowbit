import type { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/StatusBadge";

export const userInputClassName =
  "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

export function UserPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <section>
      <h1 className="text-[28px] font-semibold tracking-tight text-[var(--color-foreground)]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 text-sm leading-6 text-[var(--color-muted-foreground)]">
          {subtitle}
        </p>
      ) : null}
    </section>
  );
}

export function UserSummaryCard({
  title,
  value,
  detail,
  badge,
}: {
  title: string;
  value: string;
  detail: string;
  badge?: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{title}</p>
        {badge ? <StatusBadge status="success">{badge}</StatusBadge> : null}
      </div>
      <p className="mt-2.5 text-[22px] font-semibold tracking-tight text-[var(--color-foreground)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-5 text-[var(--color-muted-foreground)]">{detail}</p>
    </article>
  );
}

export function UserSectionCard({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-3.5">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function UserField({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">{label}</p>
        {helper ? (
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
            {helper}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
