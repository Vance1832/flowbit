"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { LOCALE_LABELS } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, toggleLocale } = useLocale();
  // Show the language you'd switch TO, like a typical language toggle.
  const next = locale === "my" ? "en" : "my";

  return (
    <button
      type="button"
      onClick={toggleLocale}
      suppressHydrationWarning
      aria-label={`Switch language to ${LOCALE_LABELS[next]}`}
      title={`Switch language to ${LOCALE_LABELS[next]}`}
      className={cn(
        "inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-semibold text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]",
        className,
      )}
    >
      {LOCALE_LABELS[next]}
    </button>
  );
}
