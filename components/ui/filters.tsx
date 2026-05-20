"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

import { SearchIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const controlBaseClassName =
  "h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:bg-white focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SearchInput({
  className,
  withIcon = true,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { withIcon?: boolean }) {
  return (
    <label className={cn("relative block", className)}>
      {withIcon ? (
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
      ) : null}
      <input
        {...props}
        type={props.type ?? "search"}
        className={cn(
          controlBaseClassName,
          "w-full pr-4",
          withIcon ? "pl-11" : "pl-4",
        )}
      />
    </label>
  );
}
