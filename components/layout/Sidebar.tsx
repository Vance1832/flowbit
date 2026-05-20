"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ArrowsIcon,
  FileIcon,
  GridIcon,
  ListIcon,
  PencilIcon,
  SparkIcon,
  VaultIcon,
  WalletIcon,
} from "@/components/icons";
import { useNotifications } from "@/components/providers/NotificationsProvider";
import type { SidebarItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const iconMap = {
  Dashboard: GridIcon,
  "User Management": FileIcon,
  "Result Periods": ListIcon,
  Ledgers: WalletIcon,
  "Result Entry": PencilIcon,
  "Settlement Preview": ArrowsIcon,
  "Company Reserve": VaultIcon,
  "Deposit Requests": WalletIcon,
  "Withdrawal Requests": WalletIcon,
  "Audit Logs": FileIcon,
  Notifications: SparkIcon,
  Settings: FileIcon,
} as const;

const availableRoutes = new Set([
  "/",
  "/user-management",
  "/result-periods",
  "/ledgers",
  "/result-entry",
  "/settlement-preview",
  "/company-reserve",
  "/deposit-requests",
  "/withdrawal-requests",
  "/audit-logs",
  "/notifications",
]);

export function Sidebar({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  return (
    <aside className="sticky top-0 flex h-screen w-[272px] shrink-0 flex-col overflow-hidden border-r border-[var(--color-border)] bg-[#f7faf8] px-4 py-4">
      <div className="shrink-0 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-sm">
            <SparkIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
              Flowbit
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
              Owner Console
            </h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
          Result periods, ledgers, wallet requests, settlement preview, and reserve operations.
        </p>
      </div>

      <nav className="mt-4 min-h-0 flex-1 overflow-y-auto pb-4 pr-1">
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = iconMap[item.label as keyof typeof iconMap] ?? FileIcon;
            const active = pathname === item.href;
            const navigable = availableRoutes.has(item.href);
            const comingSoon = !navigable;
            const badge =
              item.label === "Notifications"
                ? unreadCount > 0
                  ? `${unreadCount}`
                  : undefined
                : item.badge;

            return (
              <Link
                key={item.label}
                href={navigable ? item.href : "/"}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                  active
                    ? "bg-[var(--color-primary)] text-white shadow-[0_12px_28px_rgba(16,120,89,0.24)]"
                    : "text-[var(--color-sidebar-foreground)] hover:bg-white hover:text-[var(--color-foreground)]",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {badge ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      active
                        ? "bg-white/16 text-white"
                        : "bg-[var(--color-surface-muted)] text-[var(--color-muted-foreground)]",
                    )}
                  >
                    {badge}
                  </span>
                ) : comingSoon ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                      active
                        ? "bg-white/16 text-white"
                        : "text-[var(--color-muted-foreground)]",
                    )}
                  >
                    Soon
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-3 shrink-0 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
          Operations Status
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            System ready
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          No settlement approval pending and TEST02 remains open.
        </p>
      </div>
    </aside>
  );
}
