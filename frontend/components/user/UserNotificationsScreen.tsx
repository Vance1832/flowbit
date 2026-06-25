"use client";

import { useMemo, useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { StatTile } from "@/components/ui/StatTile";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useUserApp, type UserNotificationType } from "@/components/providers/UserAppProvider";
import { UserPageHeader } from "@/components/user/UserPrimitives";

const filters: Array<"All" | "Unread" | UserNotificationType> = [
  "All",
  "Unread",
  "Deposit",
  "Withdrawal",
  "Receipt",
  "Result",
  "Wallet",
];

function notificationTone(type: UserNotificationType) {
  switch (type) {
    case "Deposit":
      return "success" as const;
    case "Withdrawal":
      return "warning" as const;
    case "Receipt":
      return "neutral" as const;
    case "Result":
      return "info" as const;
    case "Wallet":
      return "warning" as const;
  }
}

export function UserNotificationsScreen() {
  const t = useTranslations();
  const { notifications, unreadCount, markAllNotificationsAsRead, markNotificationAsRead } =
    useUserApp();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");

  // All/Unread are localized; notification-type filters keep the provider's
  // English label so they match the type badges shown in each row.
  function filterLabel(filter: (typeof filters)[number]) {
    if (filter === "All") return t("filters.all");
    if (filter === "Unread") return t("notif.unread");
    return filter;
  }

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
  const thisWeekCount = notifications.filter((item) => item.time.startsWith(weekPrefix)).length;

  return (
    <div className="space-y-6">
      <UserPageHeader title={t("notif.title")} />

      <section className="grid grid-cols-3 gap-3">
        <StatTile label={t("notif.unread")} value={`${unreadCount}`} />
        <StatTile label={t("filters.today")} value={`${todayCount}`} />
        <StatTile label={t("filters.thisWeek")} value={`${thisWeekCount}`} />
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
                {filterLabel(filter)}
              </button>
            ))}
          </div>
          <ActionButton variant="secondary" onClick={markAllNotificationsAsRead}>
            {t("notif.markAllRead")}
          </ActionButton>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <div className="grid grid-cols-[140px_1fr_1.4fr_160px_120px_120px] gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-muted-foreground)]">
          <span>{t("common.type")}</span>
          <span>{t("notif.colTitle")}</span>
          <span>{t("notif.colMessage")}</span>
          <span>{t("notif.colTime")}</span>
          <span>{t("common.status")}</span>
          <span>{t("common.action")}</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[140px_1fr_1.4fr_160px_120px_120px] gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-[var(--color-surface-subtle)]"
            >
              <div>
                <StatusBadge status={notificationTone(item.type)}>{item.type}</StatusBadge>
              </div>
              <p className="font-medium text-[var(--color-foreground)]">{item.title}</p>
              <p className="text-[var(--color-muted-foreground)]">{item.message}</p>
              <p className="whitespace-nowrap text-[var(--color-muted-foreground)]">{item.time}</p>
              <div>
                <StatusBadge status={item.read ? "neutral" : "info"}>
                  {item.read ? t("notif.read") : t("notif.unread")}
                </StatusBadge>
              </div>
              <div>
                {!item.read ? (
                  <button
                    type="button"
                    onClick={() => markNotificationAsRead(item.id)}
                    className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                  >
                    {t("notif.markAsRead")}
                  </button>
                ) : (
                  <span className="text-sm text-[var(--color-muted-foreground)]">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
