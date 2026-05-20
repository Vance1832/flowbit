"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  BellIcon,
  FileIcon,
  GridIcon,
  PencilIcon,
  SearchIcon,
  SparkIcon,
  VaultIcon,
  WalletIcon,
} from "@/components/icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatMmk, useUserApp } from "@/components/providers/UserAppProvider";
import { cn } from "@/lib/utils";

const userSidebarItems = [
  { label: "Dashboard", href: "/user/dashboard", icon: GridIcon },
  { label: "Wallet", href: "/user/wallet", icon: WalletIcon },
  { label: "Submit Numbers", href: "/user/submit-numbers", icon: PencilIcon },
  { label: "Receipts", href: "/user/receipts", icon: FileIcon },
  { label: "Results", href: "/user/results", icon: SearchIcon },
  { label: "Notifications", href: "/user/notifications", icon: BellIcon },
  { label: "Profile", href: "/user/profile", icon: VaultIcon },
];

const pageDescriptions: Record<string, string> = {
  "/user/dashboard": "Wallet balance, current period, and recent activity",
  "/user/wallet": "Deposits, withdrawals, and wallet transactions",
  "/user/submit-numbers": "Create a receipt for the current open result period",
  "/user/receipts": "Submitted receipts and payment status",
  "/user/results": "Current and past result numbers",
  "/user/notifications": "Wallet, receipt, and result updates",
  "/user/profile": "Profile details and password settings",
};

export function UserShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const { availableBalance, lockedBalance } = useUserApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const description = useMemo(() => {
    return pageDescriptions[pathname] ?? "Wallet access and receipt activity";
  }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-app-bg)]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-5 text-sm text-[var(--color-muted-foreground)] shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
          Checking secure session...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-app-bg)] text-[var(--color-foreground)]">
      <aside className="sticky top-0 flex h-screen w-[272px] shrink-0 flex-col border-r border-[var(--color-border)] bg-white">
        <div className="border-b border-[var(--color-border)] px-5 py-5">
          <Link href="/user/dashboard" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-sm">
              <SparkIcon className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
                Flowbit
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Wallet &amp; Ledger System
              </p>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <nav className="space-y-1.5">
            {userSidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
                    isActive
                      ? "bg-emerald-50 text-[var(--color-primary)]"
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[var(--color-border)] px-4 py-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
              Wallet
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">Available</span>
                <span className="font-semibold text-[var(--color-foreground)]">
                  {formatMmk(availableBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">Locked</span>
                <span className="font-semibold text-[var(--color-foreground)]">
                  {formatMmk(lockedBalance)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
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
        <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                User Console
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
            </div>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-3 py-2 transition-colors hover:border-[var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
                  profileOpen && "border-[var(--color-border-strong)]",
                )}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((current) => !current)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/12 text-sm font-semibold text-[var(--color-primary)]">
                  FU
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    Flow Test User
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Wallet User
                  </p>
                </div>
              </button>

              {profileOpen ? (
                <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[220px] rounded-2xl border border-[var(--color-border)] bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)]">
                  <div className="rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                      Profile
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      Flow Test User
                    </p>
                  </div>
                  <div className="my-2 border-t border-[var(--color-border)]" />
                  <Link
                    href="/user/profile"
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
        </header>

        <main className="flex-1 px-6 py-6">
          <div className="mx-auto w-full max-w-[1100px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
