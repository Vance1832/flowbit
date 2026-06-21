import { cn } from "@/lib/utils";

/**
 * Compact stat tile — a label over a value, with an optional directional accent.
 * Used in dense rows (wallet balances, snapshot rows) where the heavier
 * StatCard would be too much.
 */
export function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  const accent =
    tone === "positive"
      ? "text-[var(--color-success)]"
      : tone === "negative"
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-foreground)]";

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3.5">
      <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">{label}</p>
      <p className={cn("mt-1.5 whitespace-nowrap text-base font-semibold tracking-tight", accent)}>
        {value}
      </p>
    </div>
  );
}
