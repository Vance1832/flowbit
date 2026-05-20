import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-6 py-10 text-center">
      <div className="max-w-md">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          {description}
        </p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
