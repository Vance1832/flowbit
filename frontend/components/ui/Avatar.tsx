import { cn } from "@/lib/utils";

/**
 * Shows the uploaded profile picture when available, otherwise falls back to
 * the user's initials on a tinted circle. `className` controls size/shape.
 */
export function Avatar({
  src,
  initials,
  className,
}: {
  src?: string | null;
  initials: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Profile picture"
        className={cn("h-9 w-9 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/12 text-sm font-semibold text-[var(--color-primary)]",
        className,
      )}
    >
      {initials}
    </div>
  );
}
