import { cn } from "@/lib/utils";

/**
 * Flowbit brand mark: a stylized "F" (flowing bars of decreasing width) with a
 * trailing "bit" dot, on a primary → accent gradient tile. Colors come from CSS
 * variables, so the mark adapts to light/dark themes.
 */
export function FlowbitMark({
  className,
  gradientId = "flowbit-mark-gradient",
}: {
  className?: string;
  gradientId?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="Flowbit"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--color-primary)" />
          <stop offset="1" stopColor="var(--color-accent)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gradientId})`} />
      {/* Stylized "F": vertical stroke + two flowing bars */}
      <rect x="14" y="11" width="4" height="18" rx="2" fill="#ffffff" />
      <rect x="14" y="11" width="13" height="4" rx="2" fill="#ffffff" />
      <rect x="14" y="18.5" width="9" height="4" rx="2" fill="#ffffff" />
      {/* The "bit" */}
      <circle cx="27.5" cy="27" r="2.4" fill="#ffffff" fillOpacity="0.92" />
    </svg>
  );
}

/**
 * Mark + "Flowbit" wordmark, with an optional subtitle line.
 */
export function FlowbitLogo({
  className,
  markClassName,
  subtitle,
  gradientId,
}: {
  className?: string;
  markClassName?: string;
  subtitle?: string;
  gradientId?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <FlowbitMark
        className={cn("h-10 w-10 shrink-0", markClassName)}
        gradientId={gradientId}
      />
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
          Flowbit
        </span>
        {subtitle ? (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
