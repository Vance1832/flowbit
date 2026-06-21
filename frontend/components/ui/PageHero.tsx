import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Brand gradient hero — the signature anchor for a screen, used instead of a
 * stack of equal-weight cards. Content is laid out by the caller; this owns
 * the gradient surface, radius, padding, and white text so every hero matches.
 */
export function PageHero({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-[var(--color-border)] p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]",
        "bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-strong)] to-[var(--color-accent)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** A pill for placing on top of a PageHero gradient. */
export function HeroPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
      {children}
    </span>
  );
}
