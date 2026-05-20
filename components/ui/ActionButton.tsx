import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function ActionButton({
  children,
  className,
  icon,
  variant = "primary",
  type = "button",
  ...props
}: ActionButtonProps) {
  const variants = {
    primary:
      "bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-strong)]",
    secondary:
      "border border-[var(--color-border-strong)] bg-white text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)]",
    ghost:
      "bg-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]",
    danger: "bg-[var(--color-danger)] text-white hover:bg-[#b73030]",
  } as const;

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
