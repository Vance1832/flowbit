import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { BellIcon, SearchIcon } from "@/components/icons";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  useNotifications,
  type NotificationType,
} from "@/components/providers/NotificationsProvider";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LocaleToggle } from "@/components/ui/LocaleToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

function roleLabel(role?: string | null) {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "staff":
      return "Staff";
    case "user":
      return "User";
    default:
      return "Owner";
  }
}

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

export function TopHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const latestNotifications = useMemo(() => {
    return [...notifications]
      .sort((left, right) => right.time.localeCompare(left.time))
      .slice(0, 4);
  }, [notifications]);

  const initials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return "OP";
    const parts = name.split(/\s+/);
    return (
      ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "OP"
    );
  }, [user?.name]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setProfileOpen(false);
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
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-6 py-3.5 backdrop-blur xl:px-8">
      <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-5">
        <button
          type="button"
          onClick={() => onMenuClick?.()}
          aria-label="Open menu"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-foreground)] lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <label className="relative flex w-full max-w-md items-center">
          <SearchIcon className="pointer-events-none absolute left-4 h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input
            type="search"
            placeholder="Search periods, ledgers, settlements"
            className="h-11 w-full rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] pl-11 pr-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          />
        </label>

        <div className="flex items-center gap-4">
          <LocaleToggle />
          <ThemeToggle />

          <div ref={containerRef} className="relative">
            <button
              type="button"
              className={cn(
                "relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
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
              <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[360px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_20px_50px_rgba(15,23,42,0.14)]">
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
                        <p className="mt-1.5 text-[11px] font-medium text-[var(--color-muted-foreground)]">
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

          <div ref={profileRef} className="relative">
            <button
              type="button"
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 transition-colors hover:border-[var(--color-border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
                profileOpen && "border-[var(--color-border-strong)]",
              )}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((current) => !current)}
            >
              <Avatar src={user?.avatar_url} initials={initials} />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  {user?.name ?? "Operator"}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {roleLabel(user?.role)}
                </p>
              </div>
            </button>

            {profileOpen ? (
              <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[240px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)]">
                <div className="rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    Profile
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {user?.name ?? "Owner Console"}
                  </p>
                </div>
                <div className="rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    Role
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                    {roleLabel(user?.role)}
                  </p>
                </div>
                <div className="my-2 border-t border-[var(--color-border)]" />
                <Link
                  href="/profile"
                  className="flex rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-subtle)]"
                  onClick={() => setProfileOpen(false)}
                >
                  Profile
                </Link>
                <button
                  type="button"
                  className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                  onClick={() => {
                    logout();
                    setProfileOpen(false);
                    router.replace("/login");
                  }}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
