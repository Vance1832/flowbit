"use client";

import { useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { AnnouncementComposer } from "@/components/owner/AnnouncementComposer";
import {
  useNotifications,
  type NotificationType,
} from "@/components/providers/NotificationsProvider";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

const filters = [
  "All",
  "Unread",
  "Deposit",
  "Withdrawal",
  "Settlement",
  "Result",
  "System",
] as const;

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

export function NotificationsScreen() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((item) => {
        if (activeFilter === "All") return true;
        if (activeFilter === "Unread") return !item.read;
        return item.type === activeFilter;
      })
      .sort((left, right) => {
        if (left.read !== right.read) return left.read ? 1 : -1;
        return right.time.localeCompare(left.time);
      });
  }, [activeFilter, notifications]);

  const criticalCount = notifications.filter((item) => item.critical).length;

  return (
    <div className="space-y-5">
      <section className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Notifications
          </h1>
        </div>
        <ActionButton variant="secondary" onClick={markAllAsRead}>
          Mark All as Read
        </ActionButton>
      </section>

      <AnnouncementComposer />

      <section className="grid gap-4 xl:grid-cols-4">
        <StatCard
          title="Unread"
          value={`${unreadCount}`}
          delta="Queue"
          tone="warning"
          detail="Notifications awaiting review"
        />
        <StatCard
          title="Today"
          value="8"
          delta="Events"
          tone="neutral"
          detail="Generated across owner activity"
        />
        <StatCard
          title="This Week"
          value="42"
          delta="Events"
          tone="neutral"
          detail="Total notifications this week"
        />
        <article className="flex min-h-[144px] flex-col justify-between rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-amber-900">Critical</p>
              <p className="mt-2 text-[24px] font-semibold tracking-tight text-amber-950">
                {criticalCount}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
              Alert
            </span>
          </div>
          <p className="mt-3 text-sm leading-5 text-amber-900/80">
            Requires owner attention
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
                activeFilter === filter
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface-subtle)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Notification List
          </h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-emerald-50/70",
                !item.read && "bg-emerald-50/40",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={typeTone(item.type)}>{item.type}</StatusBadge>
                  {item.critical ? <StatusBadge status="danger">Critical</StatusBadge> : null}
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    {item.title}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {item.message}
                </p>
                <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  {item.time}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge status={item.read ? "neutral" : "info"}>
                  {item.read ? "Read" : "Unread"}
                </StatusBadge>
                {!item.read ? (
                  <button
                    type="button"
                    className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                    onClick={() => markAsRead(item.id)}
                  >
                    Mark as Read
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
