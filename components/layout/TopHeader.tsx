import { BellIcon, SearchIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white/90 px-6 py-3 backdrop-blur xl:px-8">
      <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-5">
        <label className="relative flex w-full max-w-md items-center">
          <SearchIcon className="pointer-events-none absolute left-4 h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input
            type="search"
            placeholder="Search periods, ledgers, settlements"
            className="h-10 w-full rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] pl-11 pr-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
          />
        </label>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-2 lg:flex">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                System Status
              </p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status="success">LIVE</StatusBadge>
                <span className="text-sm font-medium text-[var(--color-foreground)]">
                  Last Sync 09:48 AM
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="relative rounded-2xl border border-[var(--color-border)] bg-white p-2.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
            aria-label="Notifications"
          >
            <BellIcon className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
          </button>

          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/12 text-sm font-semibold text-[var(--color-primary)]">
              OC
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Owner Console
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Primary Operator
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
