import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { BellIcon, SearchIcon } from "@/components/icons";
import {
  useNotifications,
  type NotificationType,
} from "@/components/providers/NotificationsProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

function typeTone(type: NotificationType) {
  switch (type) {
    case "Deposit":
      return "success" as const;
    case "Withdrawal":
      return "warning" as const;
    case "Settlement":
      return "danger" as const;
    case "Result":
      return "info" as const;
    case "System":
      return "neutral" as const;
  }
}

export function TopHeader() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const latestNotifications = useMemo(() => {
    return [...notifications]
      .sort((left, right) => right.time.localeCompare(left.time))
      .slice(0, 4);
  }, [notifications]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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

          <div ref={containerRef} className="relative">
            <button
              type="button"
              className={cn(
                "relative rounded-2xl border border-[var(--color-border)] bg-white p-2.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
                open && "text-[var(--color-foreground)]",
              )}
              aria-label="Notifications"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
            >
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>

            {open ? (
              <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[360px] rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.14)]">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-4 py-3.5">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                      Notifications
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Latest system alerts
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                    onClick={() => {
                      markAllAsRead();
                    }}
                  >
                    Mark all as read
                  </button>
                </div>

                <div className="max-h-[360px] overflow-y-auto">
                  {latestNotifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:bg-emerald-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700/30",
                        !item.read && "bg-emerald-50/40",
                      )}
                      onClick={() => markAsRead(item.id)}
                    >
                      <div className="pt-0.5">
                        <StatusBadge status={typeTone(item.type)}>{item.type}</StatusBadge>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--color-foreground)]">
                            {item.title}
                          </p>
                          <StatusBadge status={item.read ? "neutral" : "info"}>
                            {item.read ? "Read" : "Unread"}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                          {item.message}
                        </p>
                        <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                          {item.time}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end px-4 py-3">
                  <Link
                    href="/notifications"
                    className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                    onClick={() => setOpen(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

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
