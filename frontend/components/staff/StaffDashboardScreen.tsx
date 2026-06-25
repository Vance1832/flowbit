"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero } from "@/components/ui/PageHero";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useStaffApp } from "@/components/providers/StaffAppProvider";
import { UserSectionCard } from "@/components/user/UserPrimitives";
import { ensureResults } from "@/lib/api/types";
import {
  getAdminDepositRequests,
  getAdminWithdrawalRequests,
  type ApiDepositRequest,
  type ApiWithdrawalRequest,
} from "@/lib/api/wallets";
import { formatDateTime, formatMmkAmount } from "@/lib/format";
import type { StatusTone, TableColumn } from "@/lib/types";

type QueueRow = {
  id: string;
  type: "Deposit" | "Withdrawal";
  user: string;
  amount: number;
  status: string;
  assignedTo: string | null;
  submitted: string;
};

function statusTone(status: string): StatusTone {
  switch (status) {
    case "pending":
      return "warning";
    case "approved":
      return "info";
    case "in_review":
      return "neutral";
    case "paid":
      return "success";
    default:
      return "neutral";
  }
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function StaffDashboardScreen() {
  const t = useTranslations();
  const typeLabel = (type: "Deposit" | "Withdrawal") =>
    type === "Deposit" ? t("staffDash.typeDeposit") : t("staffDash.typeWithdrawal");
  const { profile, unreadCount } = useStaffApp();
  const [deposits, setDeposits] = useState<ApiDepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<ApiWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [depositResponse, withdrawalResponse] = await Promise.all([
        getAdminDepositRequests(),
        getAdminWithdrawalRequests(),
      ]);
      setDeposits(ensureResults(depositResponse));
      setWithdrawals(ensureResults(withdrawalResponse));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("staffDash.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // Load once on mount; loadData only re-reads t for an error fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingDeposits = deposits.filter((item) => item.status === "pending");
  const inReviewDeposits = deposits.filter((item) => item.status === "in_review");
  const pendingWithdrawals = withdrawals.filter((item) => item.status === "pending");
  const approvedWaitingPayment = withdrawals.filter((item) => item.status === "approved");

  const assignedToMeCount =
    deposits.filter((item) => item.assigned_to_name === profile.name).length +
    withdrawals.filter(
      (item) =>
        item.reviewed_by_name === profile.name || item.paid_by_name === profile.name,
    ).length;

  const summaryCards = useMemo(
    () => [
      {
        title: t("staffDash.cardPendingDeposits"),
        value: `${pendingDeposits.length}`,
        delta: formatMmkAmount(
          pendingDeposits.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: "warning" as const,
        detail: t("staffDash.pendingDepositsDetail"),
      },
      {
        title: t("staffDash.cardInReviewDeposits"),
        value: `${inReviewDeposits.length}`,
        delta: formatMmkAmount(
          inReviewDeposits.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: "neutral" as const,
        detail: t("staffDash.inReviewDepositsDetail"),
      },
      {
        title: t("staffDash.cardPendingWithdrawals"),
        value: `${pendingWithdrawals.length}`,
        delta: formatMmkAmount(
          pendingWithdrawals.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: "warning" as const,
        detail: t("staffDash.pendingWithdrawalsDetail"),
      },
      {
        title: t("staffDash.cardApprovedWaiting"),
        value: `${approvedWaitingPayment.length}`,
        delta: formatMmkAmount(
          approvedWaitingPayment.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: "positive" as const,
        detail: t("staffDash.approvedWaitingDetail"),
      },
    ],
    [approvedWaitingPayment, inReviewDeposits, pendingDeposits, pendingWithdrawals, t],
  );

  const queueRows = useMemo<QueueRow[]>(() => {
    const depositRows: QueueRow[] = deposits.map((item) => ({
      id: `deposit-${item.id}`,
      type: "Deposit",
      user: item.user_name ?? item.user_phone ?? `User #${item.id}`,
      amount: Number(item.amount),
      status: item.status,
      assignedTo: item.assigned_to_name ?? null,
      submitted: formatDateTime(item.created_at),
    }));

    const withdrawalRows: QueueRow[] = withdrawals.map((item) => ({
      id: `withdrawal-${item.id}`,
      type: "Withdrawal",
      user: item.user_name ?? item.user_phone ?? `User #${item.id}`,
      amount: Number(item.amount),
      status: item.status,
      assignedTo: item.paid_by_name ?? item.reviewed_by_name ?? null,
      submitted: formatDateTime(item.created_at),
    }));

    return [...depositRows, ...withdrawalRows]
      .sort((left, right) => right.submitted.localeCompare(left.submitted))
      .slice(0, 8);
  }, [deposits, withdrawals]);

  const queueColumns: TableColumn<QueueRow>[] = [
    {
      key: "type",
      header: t("staffDash.colType"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={row.type === "Deposit" ? "success" : "warning"}>
          {typeLabel(row.type)}
        </StatusBadge>
      ),
    },
    {
      key: "user",
      header: t("staffDash.colUser"),
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.user}</span>,
    },
    {
      key: "amount",
      header: t("common.amount"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.amount),
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
    {
      key: "assignedTo",
      header: t("staffDash.colAssignedTo"),
      className: "whitespace-nowrap",
      render: (row) => row.assignedTo ?? "—",
    },
    {
      key: "submitted",
      header: t("staffDash.colSubmitted"),
      className: "whitespace-nowrap",
      render: (row) => row.submitted,
    },
    {
      key: "action",
      header: t("common.action"),
      className: "whitespace-nowrap",
      render: (row) => (
        <Link
          href={
            row.type === "Deposit" ? "/staff/deposit-requests" : "/staff/withdrawal-requests"
          }
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
        >
          {t("staffDash.review")}
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHero>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">{t("staffDash.heroTitle")}</p>
            <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">
              {t("staffDash.welcome", { name: profile.name })}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {t("staffDash.pendingReview", {
                count: pendingDeposits.length + pendingWithdrawals.length,
                plural: pendingDeposits.length + pendingWithdrawals.length === 1 ? "" : "s",
              })}
            </p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
              {t("staffDash.assignedToYou")}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{assignedToMeCount}</p>
          </div>
        </div>
      </PageHero>

      {error ? (
        <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        {loading ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            {t("staffDash.loadingQueue")}
          </div>
        ) : queueRows.length === 0 ? (
          <EmptyState
            title={t("staffDash.noActivityTitle")}
            description={t("staffDash.noActivityDesc")}
          />
        ) : (
          <DataTable
            title={t("staffDash.queueTitle")}
            description={t("staffDash.queueDesc")}
            rows={queueRows}
            columns={queueColumns}
            tableClassName="min-w-[840px]"
          />
        )}

        <div className="space-y-4">
          <UserSectionCard title={t("staffDash.priorityTasks")}>
            <div className="space-y-2.5">
              {[
                t("staffDash.taskWithdrawals", { count: approvedWaitingPayment.length }),
                t("staffDash.taskDeposits", { count: pendingDeposits.length }),
                t("staffDash.taskAssigned", { count: assignedToMeCount }),
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3"
                >
                  <p className="text-sm font-medium text-[var(--color-foreground)]">{item}</p>
                </div>
              ))}
            </div>
          </UserSectionCard>

          <UserSectionCard title={t("staffDash.quickActions")}>
            <div className="grid gap-2.5">
              <Link
                href="/staff/deposit-requests"
                className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-[background-color,border-color,color,box-shadow] hover:border-[var(--color-primary-strong)] hover:bg-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                {t("staffDash.reviewDeposits")}
              </Link>
              <Link
                href="/staff/withdrawal-requests"
                className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] shadow-sm transition-[background-color,border-color,color,box-shadow] hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                {t("staffDash.reviewWithdrawals")}
              </Link>
              <Link
                href="/staff/notifications"
                className="inline-flex min-h-11 items-center justify-between rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] shadow-sm transition-[background-color,border-color,color,box-shadow] hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                <span>{t("staffDash.viewNotifications")}</span>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-[var(--color-primary)]">
                    {unreadCount}
                  </span>
                ) : null}
              </Link>
            </div>
          </UserSectionCard>
        </div>
      </section>
    </div>
  );
}
