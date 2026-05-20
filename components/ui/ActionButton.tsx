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
      "border border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-strong)] hover:border-[var(--color-primary-strong)]",
    secondary:
      "border border-[var(--color-border-strong)] bg-white text-[var(--color-foreground)] shadow-sm hover:bg-[var(--color-surface-muted)]",
    ghost:
      "border border-transparent bg-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]",
    danger:
      "border border-[var(--color-danger)] bg-[var(--color-danger)] text-white shadow-sm hover:border-[#b73030] hover:bg-[#b73030]",
  } as const;

  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-50",
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
