"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  BellIcon,
  FileIcon,
  GridIcon,
  WalletIcon,
} from "@/components/icons";
import { FlowbitMark } from "@/components/FlowbitLogo";
import { isStaff, useAuth } from "@/components/providers/AuthProvider";
import { useStaffApp } from "@/components/providers/StaffAppProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

const staffSidebarItems = [
  { label: "Dashboard", href: "/staff/dashboard", icon: GridIcon },
  { label: "Deposit Requests", href: "/staff/deposit-requests", icon: WalletIcon },
  {
    label: "Withdrawal Requests",
    href: "/staff/withdrawal-requests",
    icon: WalletIcon,
  },
  { label: "Notifications", href: "/staff/notifications", icon: BellIcon },
  { label: "Profile", href: "/staff/profile", icon: FileIcon },
];

const pageDescriptions: Record<string, string> = {
  "/staff/dashboard": "Pending request queues and priority actions",
  "/staff/deposit-requests": "Review and approve deposit requests",
  "/staff/withdrawal-requests": "Approve withdrawals and mark payments",
  "/staff/notifications": "Queue updates and payment alerts",
  "/staff/profile": "Profile details and password settings",
};

export function StaffShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authLoading, getDefaultRoute, isAuthenticated, logout, user } = useAuth();
  const { profile, unreadCount } = useStaffApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const canAccess = isStaff(user?.role);

  const initials = useMemo(() => {
    const name = profile.name?.trim();
    if (!name) return "ST";
    const parts = name.split(/\s+/);
    return (
      ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "ST"
    );
  }, [profile.name]);

  const description = useMemo(() => {
    return pageDescriptions[pathname] ?? "Operational request handling";
  }, [pathname]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!canAccess) {
      router.replace(getDefaultRoute(user?.role));
    }
  }, [authLoading, canAccess, getDefaultRoute, isAuthenticated, router, user?.role]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
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

  if (authLoading || !isAuthenticated || !canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-app-bg)]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-6 py-5 text-sm text-[var(--color-muted-foreground)] shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
          Checking secure session...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-app-bg)] text-[var(--color-foreground)]">
      <aside className="sticky top-0 flex h-screen w-[264px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
        <div className="border-b border-[var(--color-border)] px-5 py-5">
          <Link href="/staff/dashboard" className="inline-flex items-center gap-3">
            <FlowbitMark className="h-10 w-10 shrink-0" />
            <div>
              <p className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
                Flowbit
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Staff Console
              </p>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <nav className="space-y-1.5">
            {staffSidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const badge =
                item.label === "Notifications" && unreadCount > 0
                  ? `${unreadCount}`
                  : undefined;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
                    isActive
                      ? "bg-emerald-50 text-[var(--color-primary)] ring-1 ring-inset ring-emerald-100"
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {badge ? (
                    <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[var(--color-border)] px-4 py-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
              Queue Status
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
              {unreadCount > 0 ? `${unreadCount} unread queue alerts` : "No unread queue alerts"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Live request counts and priority items are available on the dashboard.
            </p>
          </div>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2.5 text-sm font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                Staff Console
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div ref={profileRef} className="relative">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 transition-colors hover:border-[var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
                  profileOpen && "border-[var(--color-border-strong)]",
                )}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((current) => !current)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/12 text-sm font-semibold text-[var(--color-primary)]">
                  {initials}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    {profile.name}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Queue Operator
                  </p>
                </div>
              </button>

              {profileOpen ? (
                <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[220px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)]">
                  <div className="rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                      Profile
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {profile.name}
                    </p>
                  </div>
                  <div className="my-2 border-t border-[var(--color-border)]" />
                  <Link
                    href="/staff/profile"
                    className="flex rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-subtle)]"
                    onClick={() => setProfileOpen(false)}
                  >
                    View Profile
                  </Link>
                  <button
                    type="button"
                    className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
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

        <main className="flex-1 px-6 py-5">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
