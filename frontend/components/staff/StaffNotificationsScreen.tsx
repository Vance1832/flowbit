"use client";

import { useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  useStaffApp,
  type StaffNotificationType,
} from "@/components/providers/StaffAppProvider";
import { UserPageHeader, UserSummaryCard } from "@/components/user/UserPrimitives";

const filters: Array<"All" | "Unread" | StaffNotificationType> = [
  "All",
  "Unread",
  "Deposit",
  "Withdrawal",
  "Result",
  "System",
];

function notificationTone(type: StaffNotificationType) {
  switch (type) {
    case "Deposit":
      return "success" as const;
    case "Withdrawal":
      return "warning" as const;
    case "Result":
      return "info" as const;
    case "System":
      return "neutral" as const;
  }
}

export function StaffNotificationsScreen() {
  const { loading, markAllNotificationsAsRead, markNotificationAsRead, notifications, unreadCount } =
    useStaffApp();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeFilter === "All") return true;
      if (activeFilter === "Unread") return !item.read;
      return item.type === activeFilter;
    });
  }, [activeFilter, notifications]);

  const todayDate = new Date().toISOString().slice(0, 10);
  const weekPrefix = todayDate.slice(0, 7);
  const todayCount = notifications.filter((item) => item.time.startsWith(todayDate)).length;

  return (
    <div className="space-y-5">
      <UserPageHeader title="Notifications" />

      <section className="grid gap-4 md:grid-cols-3">
        <UserSummaryCard title="Unread" value={`${unreadCount}`} detail="Unread queue alerts" />
        <UserSummaryCard title="Today" value={`${todayCount}`} detail="Updates from today" />
        <UserSummaryCard
          title="This Week"
          value={`${notifications.filter((item) => item.time.startsWith(weekPrefix)).length}`}
          detail="Updates from this week"
        />
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? "border-[var(--color-primary)] bg-emerald-50 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <ActionButton variant="secondary" onClick={markAllNotificationsAsRead}>
            Mark All as Read
          </ActionButton>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        {loading ? (
          <div className="px-5 py-4 text-sm text-[var(--color-muted-foreground)]">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="px-5 py-6 text-sm text-[var(--color-muted-foreground)]">
            No notifications yet.
          </div>
        ) : (
        <>
        <div className="grid grid-cols-[130px_1fr_1.5fr_160px_120px_120px] gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.02em] text-[var(--color-muted-foreground)]">
          <span>Type</span>
          <span>Title</span>
          <span>Message</span>
          <span>Time</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[130px_1fr_1.5fr_160px_120px_120px] gap-4 px-5 py-3 text-sm transition-colors hover:bg-[var(--color-surface-subtle)]"
            >
              <div>
                <StatusBadge status={notificationTone(item.type)}>{item.type}</StatusBadge>
              </div>
              <p className="font-medium text-[var(--color-foreground)]">{item.title}</p>
              <p className="text-[var(--color-muted-foreground)]">{item.message}</p>
              <p className="whitespace-nowrap text-[var(--color-muted-foreground)]">{item.time}</p>
              <div>
                <StatusBadge status={item.read ? "neutral" : "info"}>
                  {item.read ? "Read" : "Unread"}
                </StatusBadge>
              </div>
              <div>
                {!item.read ? (
                  <button
                    type="button"
                    onClick={() => markNotificationAsRead(item.id)}
                    className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                  >
                    Mark as Read
                  </button>
                ) : (
                  <span className="text-sm text-[var(--color-muted-foreground)]">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
        )}
      </section>
    </div>
  );
}
