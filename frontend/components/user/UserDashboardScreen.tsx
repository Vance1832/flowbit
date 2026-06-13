"use client";

import { useRouter } from "next/navigation";

import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatMmk,
  useUserApp,
  type UserWalletTransaction,
} from "@/components/providers/UserAppProvider";
import { UserPageHeader, UserSummaryCard } from "@/components/user/UserPrimitives";
import type { TableColumn } from "@/lib/types";

type ActivityRow = UserWalletTransaction;

const activityColumns: TableColumn<ActivityRow>[] = [
  {
    key: "type",
    header: "Type",
    className: "min-w-[180px] whitespace-nowrap",
    render: (row) => <span className="font-medium">{row.type}</span>,
  },
  {
    key: "reference",
    header: "Reference",
    className: "whitespace-nowrap",
    render: (row) => row.reference,
  },
  {
    key: "amount",
    header: "Amount",
    className: "whitespace-nowrap",
    render: (row) => (row.amount === null ? "—" : formatMmk(row.amount)),
  },
  {
    key: "status",
    header: "Status",
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
    header: "Date",
    className: "whitespace-nowrap",
    render: (row) => row.date,
  },
  {
    key: "action",
    header: "Action",
    className: "whitespace-nowrap",
    render: () => (
      <button
        type="button"
        className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
      >
        View
      </button>
    ),
  },
];

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

  return (
    <div className="space-y-6">
      <UserPageHeader
        title="Dashboard"
      />

      {providerError ? (
        <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
          {providerError}
        </div>
      ) : null}

      {currentPeriod ? (
      <section className="rounded-[28px] border border-[var(--color-border)] bg-white px-6 py-6 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Current Result Period
            </p>
            <div className="mt-3 flex items-center gap-3">
              <h2 className="text-[34px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {currentPeriod.code}
              </h2>
              <StatusBadge status="success">{currentPeriod.status}</StatusBadge>
            </div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-[var(--color-primary)]">
            Closes in {currentPeriod.closesIn}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[24px] font-semibold tracking-[0.22em] text-[var(--color-primary)]">
              {currentPeriod.pendingMask}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
              <span>Result Date: {currentPeriod.resultDate}</span>
              <span className="hidden h-1 w-1 rounded-full bg-[var(--color-border-strong)] sm:block" />
              <span>Closes at: {currentPeriod.closesAt}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton
              className="h-11 rounded-xl px-5"
              onClick={() => router.push("/user/submit-numbers")}
            >
              Submit Numbers
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-11 rounded-xl px-5"
              onClick={() => router.push("/user/results")}
            >
              View Results
            </ActionButton>
          </div>
        </div>
      </section>
      ) : latestVisibleResult ? (
      <section className="rounded-[28px] border border-[var(--color-border)] bg-white px-6 py-6 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Latest Result
            </p>
            <div className="mt-3 flex items-center gap-3">
              <h2 className="text-[34px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {latestVisibleResult.code}
              </h2>
              <StatusBadge status="info">Published</StatusBadge>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[24px] font-semibold tracking-[0.16em] text-[var(--color-primary)]">
              {latestVisibleResult.resultNumber}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
              <span>Result Date: {latestVisibleResult.resultDate}</span>
              <span className="hidden h-1 w-1 rounded-full bg-[var(--color-border-strong)] sm:block" />
              <span>Visible until: {latestVisibleResult.visibleUntil}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton
              variant="secondary"
              className="h-11 rounded-xl px-5"
              onClick={() => router.push("/user/results")}
            >
              View Results
            </ActionButton>
          </div>
        </div>
      </section>
      ) : loading ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          Loading current result period...
        </div>
      ) : (
        <EmptyState
          title="No open result period right now"
          description="The next visible result period will appear here when it opens."
        />
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <UserSummaryCard
          title="Available Balance"
          value={formatMmk(availableBalance)}
          detail="Ready to submit numbers"
        />
        <UserSummaryCard
          title="Locked Balance"
          value={formatMmk(lockedBalance)}
          detail="No pending holds"
        />
        <UserSummaryCard
          title="Latest Receipt"
          value={latestReceipt?.receiptNo ?? "—"}
          detail={latestReceipt?.status ?? "No receipt yet"}
          badge={latestReceipt?.status === "Paid" ? "Paid" : undefined}
        />
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            variant="secondary"
            className="h-11 rounded-xl px-5"
            onClick={() => router.push("/user/wallet")}
          >
            Deposit
          </ActionButton>
          <ActionButton
            variant="secondary"
            className="h-11 rounded-xl px-5"
            onClick={() => router.push("/user/wallet")}
          >
            Withdraw
          </ActionButton>
          <ActionButton
            className="h-11 rounded-xl px-5"
            onClick={() => router.push("/user/submit-numbers")}
            disabled={!currentPeriod}
          >
            Submit Numbers
          </ActionButton>
          <ActionButton
            variant="secondary"
            className="h-11 rounded-xl px-5"
            onClick={() => router.push("/user/receipts")}
          >
            Receipts
          </ActionButton>
        </div>
      </section>

      <DataTable
        title="Recent Activity"
        description="Latest wallet and receipt activity."
        columns={activityColumns}
        rows={activity}
        tableClassName="min-w-[900px]"
      />

      <section className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Notifications
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
