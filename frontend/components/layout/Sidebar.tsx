"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
import { FlowbitMark } from "@/components/FlowbitLogo";
import { useNotifications } from "@/components/providers/NotificationsProvider";
import { ensureResults } from "@/lib/api/types";
import {
  getAdminDepositRequests,
  getAdminWithdrawalRequests,
} from "@/lib/api/wallets";
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
  "/console",
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

export function Sidebar({
  items,
  open = false,
  onNavigate,
}: {
  items: SidebarItem[];
  open?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const [depositCount, setDepositCount] = useState<number | null>(null);
  const [withdrawalCount, setWithdrawalCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCounts() {
      try {
        const [depositResponse, withdrawalResponse] = await Promise.all([
          getAdminDepositRequests(),
          getAdminWithdrawalRequests(),
        ]);

        if (!active) return;

        const deposits = ensureResults(depositResponse).filter(
          (item) => item.status === "pending" || item.status === "in_review",
        );
        const withdrawals = ensureResults(withdrawalResponse).filter(
          (item) => item.status === "pending" || item.status === "approved",
        );

        setDepositCount(deposits.length);
        setWithdrawalCount(withdrawals.length);
      } catch {
        if (!active) return;
        setDepositCount(null);
        setWithdrawalCount(null);
      }
    }

    const timer = window.setTimeout(() => {
      void loadCounts();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-[272px] shrink-0 flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface-sidebar)] px-4 py-4 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <FlowbitMark className="h-11 w-11 shrink-0" />
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
                : item.label === "Deposit Requests"
                  ? depositCount && depositCount > 0
                    ? `${depositCount}`
                    : undefined
                  : item.label === "Withdrawal Requests"
                    ? withdrawalCount && withdrawalCount > 0
                      ? `${withdrawalCount}`
                      : undefined
                : item.badge;

            return (
              <Link
                key={item.label}
                href={navigable ? item.href : "/console"}
                onClick={() => onNavigate?.()}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                  active
                    ? "bg-[var(--color-primary)] text-white shadow-[0_12px_28px_rgba(16,120,89,0.24)]"
                    : "text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-foreground)]",
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

    </aside>
  );
}
