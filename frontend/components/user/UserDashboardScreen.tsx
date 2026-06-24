"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroPill, PageHero } from "@/components/ui/PageHero";
import { StatTile } from "@/components/ui/StatTile";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatMmk,
  useUserApp,
  type UserWalletTransaction,
} from "@/components/providers/UserAppProvider";
import { UserPageHeader } from "@/components/user/UserPrimitives";

const heroPrimaryButton =
  "h-11 rounded-xl px-5 border-white bg-white text-[var(--color-primary)] hover:border-white hover:bg-white/90";
const heroGhostButton =
  "h-11 rounded-xl px-5 border-white/30 bg-white/15 text-white hover:bg-white/25";
import type { TableColumn } from "@/lib/types";

type ActivityRow = UserWalletTransaction;

type Translate = ReturnType<typeof useTranslations>;

function buildActivityColumns(t: Translate): TableColumn<ActivityRow>[] {
  return [
    {
      key: "type",
      header: t("common.type"),
      className: "min-w-[180px] whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.type}</span>,
    },
    {
      key: "reference",
      header: t("common.reference"),
      className: "whitespace-nowrap",
      render: (row) => row.reference,
    },
    {
      key: "amount",
      header: t("common.amount"),
      className: "whitespace-nowrap",
      render: (row) => (row.amount === null ? "—" : formatMmk(row.amount)),
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge
          status={
            row.status === "Paid" || row.status === "Completed"
              ? "success"
              : row.status === "Open"
                ? "info"
                : "neutral"
          }
        >
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: "date",
      header: t("common.date"),
      className: "whitespace-nowrap",
      render: (row) => row.date,
    },
    {
      key: "action",
      header: t("common.action"),
      className: "whitespace-nowrap",
      render: () => (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
        >
          {t("common.view")}
        </button>
      ),
    },
  ];
}

function notificationTone(
  type: "Deposit" | "Withdrawal" | "Result" | "Receipt" | "Wallet",
) {
  switch (type) {
    case "Deposit":
      return "success" as const;
    case "Withdrawal":
      return "warning" as const;
    case "Result":
      return "info" as const;
    case "Receipt":
      return "neutral" as const;
    case "Wallet":
      return "warning" as const;
  }
}

export function UserDashboardScreen() {
  const router = useRouter();
  const t = useTranslations();
  const {
    loading,
    error: providerError,
    availableBalance,
    lockedBalance,
    receipts,
    activity,
    notifications,
    currentPeriod,
    latestVisibleResult,
  } =
    useUserApp();

  const latestReceipt = receipts[0];
  const activityColumns = useMemo(() => buildActivityColumns(t), [t]);

  return (
    <div className="space-y-6">
      <UserPageHeader
        title={t("dashboard.title")}
      />

      {providerError ? (
        <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
          {providerError}
        </div>
      ) : null}

      {currentPeriod ? (
      <PageHero>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">{t("dashboard.currentResultPeriod")}</p>
            <div className="mt-3 flex items-center gap-3">
              <h2 className="text-[34px] font-semibold tracking-tight">{currentPeriod.code}</h2>
              <HeroPill>{currentPeriod.status}</HeroPill>
            </div>
          </div>
          <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white">
            {t("dashboard.closesIn", { time: currentPeriod.closesIn })}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[24px] font-semibold tracking-[0.22em] text-white">
              {currentPeriod.pendingMask}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span>{t("dashboard.resultDate", { date: currentPeriod.resultDate })}</span>
              <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:block" />
              <span>{t("dashboard.closesAt", { time: currentPeriod.closesAt })}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton
              className={heroPrimaryButton}
              onClick={() => router.push("/user/submit-numbers")}
            >
              {t("dashboard.submitNumbers")}
            </ActionButton>
            <ActionButton
              variant="secondary"
              className={heroGhostButton}
              onClick={() => router.push("/user/results")}
            >
              {t("dashboard.viewResults")}
            </ActionButton>
          </div>
        </div>
      </PageHero>
      ) : latestVisibleResult ? (
      <PageHero>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">{t("dashboard.latestResult")}</p>
            <div className="mt-3 flex items-center gap-3">
              <h2 className="text-[34px] font-semibold tracking-tight">{latestVisibleResult.code}</h2>
              <HeroPill>{t("dashboard.published")}</HeroPill>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[24px] font-semibold tracking-[0.16em] text-white">
              {latestVisibleResult.resultNumber}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span>{t("dashboard.resultDate", { date: latestVisibleResult.resultDate })}</span>
              <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:block" />
              <span>{t("dashboard.visibleUntil", { date: latestVisibleResult.visibleUntil })}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton
              variant="secondary"
              className={heroGhostButton}
              onClick={() => router.push("/user/results")}
            >
              {t("dashboard.viewResults")}
            </ActionButton>
          </div>
        </div>
      </PageHero>
      ) : loading ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          {t("dashboard.loadingPeriod")}
        </div>
      ) : (
        <EmptyState
          title={t("dashboard.noPeriodTitle")}
          description={t("dashboard.noPeriodDesc")}
        />
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label={t("dashboard.availableBalance")} value={formatMmk(availableBalance)} />
        <StatTile label={t("dashboard.lockedBalance")} value={formatMmk(lockedBalance)} />
        <StatTile label={t("dashboard.latestReceipt")} value={latestReceipt?.receiptNo ?? "—"} />
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            variant="secondary"
            className="h-11 rounded-xl px-5"
            onClick={() => router.push("/user/wallet")}
          >
            {t("dashboard.deposit")}
          </ActionButton>
          <ActionButton
            variant="secondary"
            className="h-11 rounded-xl px-5"
            onClick={() => router.push("/user/wallet")}
          >
            {t("dashboard.withdraw")}
          </ActionButton>
          <ActionButton
            className="h-11 rounded-xl px-5"
            onClick={() => router.push("/user/submit-numbers")}
            disabled={!currentPeriod}
          >
            {t("dashboard.submitNumbers")}
          </ActionButton>
          <ActionButton
            variant="secondary"
            className="h-11 rounded-xl px-5"
            onClick={() => router.push("/user/receipts")}
          >
            {t("dashboard.receipts")}
          </ActionButton>
        </div>
      </section>

      <DataTable
        title={t("dashboard.recentActivity")}
        description={t("dashboard.recentActivityDesc")}
        columns={activityColumns}
        rows={activity}
        tableClassName="min-w-[900px]"
      />

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            {t("dashboard.notifications")}
          </h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {notifications.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-[var(--color-surface-subtle)]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={notificationTone(item.type)}>{item.type}</StatusBadge>
                  <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                    {item.title}
                  </p>
                </div>
              </div>
              <p className="shrink-0 whitespace-nowrap text-xs font-medium text-[var(--color-muted-foreground)]">
                {item.time}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
