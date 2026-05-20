"use client";

import { useState } from "react";

import { ChevronRightIcon, SparkIcon } from "@/components/icons";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  recentAudits,
  reserveBreakdown,
  resultPeriods,
  settlementQueue,
  statMetrics,
} from "@/lib/mock-data";
import type { ResultPeriod, SettlementItem, TableColumn } from "@/lib/types";

const resultColumns: TableColumn<ResultPeriod>[] = [
  {
    key: "period",
    header: "Result Period",
    render: (row) => (
      <div>
        <p className="font-semibold text-[var(--color-foreground)]">
          {row.drawCode}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {row.name}
        </p>
      </div>
    ),
  },
  {
    key: "resultDate",
    header: "Result Date",
    render: (row) => row.resultDate,
  },
  {
    key: "closeAt",
    header: "Closes",
    render: (row) => row.closeAt,
  },
  {
    key: "entries",
    header: "Entries",
    render: (row) => row.entries.toLocaleString(),
  },
  {
    key: "totalCollected",
    header: "Total Collected",
    render: (row) => row.totalCollected,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <StatusBadge status={row.status}>
        {row.status === "success" ? "Open" : "Pending"}
      </StatusBadge>
    ),
  },
];

const settlementColumns: TableColumn<SettlementItem>[] = [
  {
    key: "batch",
    header: "Batch",
    render: (row) => (
      <div>
        <p className="font-semibold text-[var(--color-foreground)]">{row.batch}</p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {row.ledger}
        </p>
      </div>
    ),
  },
  {
    key: "resultPeriod",
    header: "Result Period",
    render: (row) => row.resultPeriod,
  },
  {
    key: "resultNumber",
    header: "Result",
    render: (row) => row.resultNumber,
  },
  {
    key: "totalCollected",
    header: "Total Collected",
    render: (row) => row.totalCollected,
  },
  {
    key: "totalSettlement",
    header: "Total Settlement",
    render: (row) => row.totalSettlement,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <StatusBadge status={row.status}>
        {row.status === "info" ? "Paid" : "Previewed"}
      </StatusBadge>
    ),
  },
];

export function DashboardScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<ResultPeriod | null>(null);
  const [selectedSettlement, setSelectedSettlement] =
    useState<SettlementItem | null>(settlementQueue[0] ?? null);
  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false);

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Operations Dashboard
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Real-time overview of result periods, wallet requests, settlements, and reserve operations.
            </p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <article className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                  Priority Alerts
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Immediate actions and current status.
                </p>
              </div>
              <StatusBadge status="success">Live</StatusBadge>
            </div>
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5 text-[var(--color-foreground)]">
                    3 withdrawal requests are approved and waiting to be marked as paid
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    Withdrawal Requests
                  </p>
                </div>
                <ActionButton
                  variant="secondary"
                  className="shrink-0 px-3 py-2 text-xs"
                  onClick={() => setConfirmPaidOpen(true)}
                >
                  Mark Paid
                </ActionButton>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3">
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  TEST02 closes today at 15:00
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Result Periods
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3">
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  No settlement approval pending
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Settlement Preview
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                  Quick Actions
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Common admin actions.
                </p>
              </div>
              <SparkIcon className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <ActionButton className="h-10 justify-start px-3.5 text-sm">
                Create Result Period
              </ActionButton>
              <ActionButton variant="secondary" className="h-10 justify-start px-3.5 text-sm">
                Create Ledger
              </ActionButton>
              <ActionButton variant="secondary" className="h-10 justify-start px-3.5 text-sm">
                Enter Result
              </ActionButton>
              <ActionButton variant="secondary" className="h-10 justify-start px-3.5 text-sm">
                View Settlement
              </ActionButton>
              <ActionButton variant="secondary" className="h-10 justify-start px-3.5 text-sm sm:col-span-2">
                Add Reserve
              </ActionButton>
            </div>
          </article>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
          {statMetrics.map((metric) => (
            <StatCard key={metric.title} {...metric} />
          ))}
        </section>

        <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.92fr)]">
          <div className="space-y-4">
            <DataTable
              title="Result Periods"
              description="Current result period from the admin ledger workflow."
              rows={resultPeriods}
              columns={[
                ...resultColumns,
                {
                  key: "actions",
                  header: "",
                  className: "w-28",
                  render: (row) => (
                    <ActionButton
                      variant="ghost"
                      className="px-0 text-[var(--color-primary)] hover:bg-transparent"
                      onClick={() => setSelectedPeriod(row)}
                    >
                      Inspect
                      <ChevronRightIcon className="h-4 w-4" />
                    </ActionButton>
                  ),
                },
              ]}
              actions={<ActionButton variant="secondary">View All</ActionButton>}
            />

            <DataTable
              title="Settlement Preview"
              description="Latest settlement preview generated after result entry."
              rows={settlementQueue}
              columns={[
                ...settlementColumns,
                {
                  key: "actions",
                  header: "",
                  className: "w-36",
                  render: (row) => (
                    <ActionButton
                      variant="ghost"
                      className="px-0 text-[var(--color-primary)] hover:bg-transparent"
                      onClick={() => {
                        setSelectedSettlement(row);
                        setConfirmPaidOpen(true);
                      }}
                    >
                      View
                    </ActionButton>
                  ),
                },
              ]}
              actions={<ActionButton>View Settlement</ActionButton>}
            />
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                    Company Reserve
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    Compact reserve summary for the latest settlement state.
                  </p>
                </div>
                <StatusBadge status="success">Healthy</StatusBadge>
              </div>
              <div className="mt-4 space-y-3">
                {reserveBreakdown.map((entry) => (
                  <div
                    key={entry.label}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-foreground)]">
                          {entry.label}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                          {entry.detail}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-[var(--color-foreground)]">
                          {entry.amount}
                        </p>
                        <StatusBadge status={entry.tone}>
                          {entry.tone === "success"
                            ? "Liquid"
                            : entry.tone === "warning"
                              ? "Allocated"
                              : "Held"}
                        </StatusBadge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <DataTable
              title="Recent Audit Logs"
              description="Latest admin actions recorded in the system."
              rows={recentAudits}
              columns={[
                {
                  key: "actor",
                  header: "Actor",
                  render: (row) => row.actor,
                },
                {
                  key: "action",
                  header: "Action",
                  render: (row) => row.action,
                },
                {
                  key: "target",
                  header: "Target",
                  render: (row) => row.target,
                },
                {
                  key: "reason",
                  header: "Reason",
                  render: (row) => row.reason,
                },
                {
                  key: "time",
                  header: "Time",
                  render: (row) => row.at,
                },
              ]}
              actions={<ActionButton variant="secondary">Open Audit Logs</ActionButton>}
            />
          </div>
        </section>
      </div>

      <DetailDrawer
        open={selectedPeriod !== null}
        title={selectedPeriod?.drawCode ?? ""}
        subtitle={selectedPeriod?.name}
        onClose={() => setSelectedPeriod(null)}
      >
        {selectedPeriod ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Submission Window
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
                  Closes {selectedPeriod.closeAt}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Total Collected
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
                  {selectedPeriod.totalCollected}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
              <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Intake Snapshot
              </h4>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[var(--color-muted-foreground)]">
                    Accepted number submissions
                  </span>
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {selectedPeriod.entries.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[var(--color-muted-foreground)]">
                    Status
                  </span>
                  <StatusBadge status={selectedPeriod.status}>
                    {selectedPeriod.status === "success" ? "Open" : "Pending"}
                  </StatusBadge>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[var(--color-muted-foreground)]">
                    Result Date
                  </span>
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {selectedPeriod.resultDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <ActionButton>Enter Result</ActionButton>
              <ActionButton variant="secondary">View Ledger</ActionButton>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmModal
        open={confirmPaidOpen}
        title="Mark Withdrawal Requests as Paid"
        description="Use this action after approved withdrawal requests have been transferred and need to be marked as paid in the admin workflow."
        confirmLabel="Mark as Paid"
        onClose={() => setConfirmPaidOpen(false)}
        onConfirm={() => setConfirmPaidOpen(false)}
      >
        {selectedSettlement ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 text-sm text-[var(--color-muted-foreground)]">
            <p className="font-semibold text-[var(--color-foreground)]">
              {selectedSettlement.batch}
            </p>
            <p className="mt-1">
              {selectedSettlement.resultPeriod} / {selectedSettlement.ledger}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.12em]">Collected</p>
                <p className="mt-1 font-semibold text-[var(--color-foreground)]">
                  {selectedSettlement.totalCollected}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em]">Settlement</p>
                <p className="mt-1 font-semibold text-[var(--color-foreground)]">
                  {selectedSettlement.totalSettlement}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No settlement preview selected"
            description="Open a settlement preview row first, or mark approved withdrawal requests directly from the priority alerts card."
          />
        )}
      </ConfirmModal>
    </>
  );
}
