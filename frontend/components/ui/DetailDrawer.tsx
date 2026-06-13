"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { CloseIcon } from "@/components/icons";

export function DetailDrawer({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-slate-950/30 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-[720px] border-l border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_24px_60px_rgba(15,23,42,0.18)] transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-6 py-4 backdrop-blur">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            onClick={onClose}
            aria-label="Close detail drawer"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[calc(100%-81px)] overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}
