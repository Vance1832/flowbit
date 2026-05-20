import type { StatusTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const tones: Record<StatusTone, string> = {
  neutral:
    "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] ring-[var(--badge-neutral-ring)]",
  success:
    "bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)] ring-[var(--badge-success-ring)]",
  warning:
    "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-fg)] ring-[var(--badge-warning-ring)]",
  danger:
    "bg-[var(--badge-danger-bg)] text-[var(--badge-danger-fg)] ring-[var(--badge-danger-ring)]",
  info: "bg-[var(--badge-info-bg)] text-[var(--badge-info-fg)] ring-[var(--badge-info-ring)]",
};

export function StatusBadge({
  status,
  children,
}: {
  status: StatusTone;
  children: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset",
        tones[status],
      )}
    >
      {children}
    </span>
  );
}
