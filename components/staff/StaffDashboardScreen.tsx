"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useStaffApp } from "@/components/providers/StaffAppProvider";
import { UserPageHeader, UserSectionCard } from "@/components/user/UserPrimitives";
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
      setError(loadError instanceof Error ? loadError.message : "Unable to load staff dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
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
        title: "Pending Deposits",
        value: `${pendingDeposits.length}`,
        delta: formatMmkAmount(
          pendingDeposits.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: "warning" as const,
        detail: "Waiting for first review",
      },
      {
        title: "In Review Deposits",
        value: `${inReviewDeposits.length}`,
        delta: formatMmkAmount(
          inReviewDeposits.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: "neutral" as const,
        detail: "Assigned for proof checking",
      },
      {
        title: "Pending Withdrawals",
        value: `${pendingWithdrawals.length}`,
        delta: formatMmkAmount(
          pendingWithdrawals.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: "warning" as const,
        detail: "Awaiting approval decision",
      },
      {
        title: "Approved Waiting Payment",
        value: `${approvedWaitingPayment.length}`,
        delta: formatMmkAmount(
          approvedWaitingPayment.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: "positive" as const,
        detail: "Ready to be marked as paid",
      },
    ],
    [approvedWaitingPayment, inReviewDeposits, pendingDeposits, pendingWithdrawals],
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
      header: "Type",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={row.type === "Deposit" ? "success" : "warning"}>
          {row.type}
        </StatusBadge>
      ),
    },
    {
      key: "user",
      header: "User",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.user}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.amount),
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
    {
      key: "assignedTo",
      header: "Assigned To",
      className: "whitespace-nowrap",
      render: (row) => row.assignedTo ?? "—",
    },
    {
      key: "submitted",
      header: "Submitted",
      className: "whitespace-nowrap",
      render: (row) => row.submitted,
    },
    {
      key: "action",
      header: "Action",
      className: "whitespace-nowrap",
      render: (row) => (
        <Link
          href={
            row.type === "Deposit" ? "/staff/deposit-requests" : "/staff/withdrawal-requests"
          }
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
        >
          Review
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <UserPageHeader title="Staff Dashboard" />

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
          <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            Loading request queue...
          </div>
        ) : queueRows.length === 0 ? (
          <EmptyState
            title="No request activity yet"
            description="New deposit and withdrawal requests will appear here when users submit them."
          />
        ) : (
          <DataTable
            title="Recent Request Queue"
            description="Latest items requiring staff action."
            rows={queueRows}
            columns={queueColumns}
            tableClassName="min-w-[840px]"
          />
        )}

        <div className="space-y-4">
          <UserSectionCard title="Priority Tasks">
            <div className="space-y-2.5">
              {[
                `${approvedWaitingPayment.length} withdrawals approved and waiting to be marked as paid`,
                `${pendingDeposits.length} deposit requests pending review`,
                `${assignedToMeCount} requests assigned to you`,
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

          <UserSectionCard title="Quick Actions">
            <div className="grid gap-2.5">
              <Link
                href="/staff/deposit-requests"
                className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-[background-color,border-color,color,box-shadow] hover:border-[var(--color-primary-strong)] hover:bg-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                Review Deposits
              </Link>
              <Link
                href="/staff/withdrawal-requests"
                className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-border-strong)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] shadow-sm transition-[background-color,border-color,color,box-shadow] hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                Review Withdrawals
              </Link>
              <Link
                href="/staff/notifications"
                className="inline-flex min-h-11 items-center justify-between rounded-xl border border-[var(--color-border-strong)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] shadow-sm transition-[background-color,border-color,color,box-shadow] hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                <span>View Notifications</span>
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
