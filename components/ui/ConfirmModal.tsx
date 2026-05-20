"use client";

import type { ReactNode } from "react";

import { CloseIcon } from "@/components/icons";
import { ActionButton } from "@/components/ui/ActionButton";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  onConfirm,
  onClose,
  children,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[var(--color-foreground)]">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              {description}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
            onClick={onClose}
            aria-label="Close confirmation dialog"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-6 flex justify-end gap-3">
          <ActionButton variant="secondary" onClick={onClose}>
            {cancelLabel}
          </ActionButton>
          <ActionButton variant={tone} onClick={onConfirm}>
            {confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
