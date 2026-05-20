"use client";

import Link from "next/link";

import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserPageHeader, UserSectionCard } from "@/components/user/UserPrimitives";
import type { StatusTone, TableColumn } from "@/lib/types";

type QueueRow = {
  type: "Deposit" | "Withdrawal";
  user: string;
  amount: string;
  status: "Pending" | "Approved";
  assignedTo: string | null;
  submitted: string;
};

const summaryCards = [
  {
    title: "Pending Deposits",
    value: "12",
    delta: "MMK 450,000",
    tone: "warning" as const,
    detail: "Waiting for first review",
  },
  {
    title: "In Review Deposits",
    value: "5",
    delta: "MMK 180,000",
    tone: "neutral" as const,
    detail: "Assigned for proof checking",
  },
  {
    title: "Pending Withdrawals",
    value: "5",
    delta: "MMK 180,000",
    tone: "warning" as const,
    detail: "Awaiting approval decision",
  },
  {
    title: "Approved Waiting Payment",
    value: "3",
    delta: "MMK 120,000",
    tone: "positive" as const,
    detail: "Ready to be marked as paid",
  },
];

const queueRows: QueueRow[] = [
  {
    type: "Deposit",
    user: "Flow Test User",
    amount: "MMK 50,000",
    status: "Pending",
    assignedTo: null,
    submitted: "2026-06-30 10:30",
  },
  {
    type: "Withdrawal",
    user: "Aung Min",
    amount: "MMK 50,000",
    status: "Approved",
    assignedTo: "Staff One",
    submitted: "2026-06-30 10:40",
  },
];

function statusTone(status: QueueRow["status"]): StatusTone {
  return status === "Pending" ? "warning" : "info";
}

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
    render: (row) => row.amount,
  },
  {
    key: "status",
    header: "Status",
    className: "whitespace-nowrap",
    render: (row) => <StatusBadge status={statusTone(row.status)}>{row.status}</StatusBadge>,
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
        href={row.type === "Deposit" ? "/staff/deposit-requests" : "/staff/withdrawal-requests"}
        className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
      >
        Review
      </Link>
    ),
  },
];

export function StaffDashboardScreen() {
  return (
    <div className="space-y-5">
      <UserPageHeader
        title="Staff Dashboard"
        subtitle="Manage customer deposit and withdrawal requests."
      />

      <section className="grid gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <DataTable
          title="Recent Request Queue"
          description="Latest items requiring staff action."
          rows={queueRows}
          columns={queueColumns}
          tableClassName="min-w-[840px]"
        />

        <div className="space-y-4">
          <UserSectionCard title="Priority Tasks" subtitle="Immediate queue work">
            <div className="space-y-2.5">
              {[
                "3 withdrawals approved and waiting to be marked as paid",
                "12 deposit requests pending review",
                "5 requests assigned to you",
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
                className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-border-strong)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] shadow-sm transition-[background-color,border-color,color,box-shadow] hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                View Notifications
              </Link>
            </div>
          </UserSectionCard>
        </div>
      </section>
    </div>
  );
}
