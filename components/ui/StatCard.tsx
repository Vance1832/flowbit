import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  delta: string;
  detail: string;
  tone: "positive" | "negative" | "neutral" | "warning";
};

export function StatCard({
  title,
  value,
  delta,
  detail,
  tone,
}: StatCardProps) {
  const toneClasses = {
    positive: "text-[var(--color-success)]",
    negative: "text-[var(--color-danger)]",
    neutral: "text-[var(--color-muted-foreground)]",
    warning: "text-[var(--badge-warning-fg)]",
  } as const;

  return (
    <article className="flex min-h-[144px] flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[var(--color-muted-foreground)]">
            {title}
          </p>
          <p className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-semibold",
            toneClasses[tone],
          )}
        >
          {delta}
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 text-[var(--color-muted-foreground)]">
        {detail}
      </p>
    </article>
  );
}
