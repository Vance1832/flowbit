"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import {
  DropdownFilter,
  type DropdownOption,
} from "@/components/ui/DropdownFilter";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatCard } from "@/components/ui/StatCard";
import type { TableColumn } from "@/lib/types";
import { cn } from "@/lib/utils";

type AuditRole = "Owner" | "Admin" | "Staff" | "System";
type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "APPROVE"
  | "REJECT"
  | "CLOSE"
  | "ENTER_RESULT"
  | "RESERVE_DEPOSIT"
  | "MARK_PAID";
type AuditTarget =
  | "Result Period"
  | "Ledger"
  | "Deposit Request"
  | "Withdrawal Request"
  | "Settlement Batch"
  | "Company Wallet";

type AuditLog = {
  id: string;
  actor: string;
  role: AuditRole;
  action: AuditAction;
  target: AuditTarget;
  targetId: string;
  reason: string;
  time: string;
  ipAddress: string;
  userAgent: string;
  oldValues: string;
  newValues: string;
};

const actionOptions: DropdownOption[] = [
  { label: "All Actions", value: "All Actions" },
  { label: "Create", value: "CREATE" },
  { label: "Update", value: "UPDATE" },
  { label: "Approve", value: "APPROVE" },
  { label: "Reject", value: "REJECT" },
  { label: "Close", value: "CLOSE" },
  { label: "Enter Result", value: "ENTER_RESULT" },
  { label: "Reserve Deposit", value: "RESERVE_DEPOSIT" },
  { label: "Mark Paid", value: "MARK_PAID" },
];

const actorOptions: DropdownOption[] = [
  { label: "All Actors", value: "All Actors" },
  { label: "Owner", value: "Owner" },
  { label: "Admin", value: "Admin" },
  { label: "Staff", value: "Staff" },
  { label: "System", value: "System" },
];

const dateOptions: DropdownOption[] = [
  { label: "All Dates", value: "All Dates" },
  { label: "Today", value: "Today" },
  { label: "This Week", value: "This Week" },
  { label: "This Month", value: "This Month" },
];

const targetOptions: DropdownOption[] = [
  { label: "All Targets", value: "All Targets" },
  { label: "Result Periods", value: "Result Period" },
  { label: "Ledgers", value: "Ledger" },
  { label: "Deposit Requests", value: "Deposit Request" },
  { label: "Withdrawal Requests", value: "Withdrawal Request" },
  { label: "Settlement Batches", value: "Settlement Batch" },
  { label: "Company Wallet", value: "Company Wallet" },
];

const initialLogs: AuditLog[] = [
  {
    id: "al-1",
    actor: "Owner",
    role: "Owner",
    action: "ENTER_RESULT",
    target: "Result Period",
    targetId: "TEST02",
    reason: "Result number 124 entered",
    time: "2026-06-30 15:00",
    ipAddress: "203.81.65.10",
    userAgent: "Chrome / macOS",
    oldValues: '{ "status": "Open", "result_number": null }',
    newValues: '{ "status": "Closed", "result_number": "124" }',
  },
  {
    id: "al-2",
    actor: "Owner",
    role: "Owner",
    action: "APPROVE",
    target: "Settlement Batch",
    targetId: "SET-TEST02-001",
    reason: "Settlement approved",
    time: "2026-06-30 15:10",
    ipAddress: "203.81.65.10",
    userAgent: "Chrome / macOS",
    oldValues: '{ "status": "Funding Required" }',
    newValues: '{ "status": "Paid" }',
  },
  {
    id: "al-3",
    actor: "Staff One",
    role: "Staff",
    action: "APPROVE",
    target: "Deposit Request",
    targetId: "DEP-FLOW-001",
    reason: "Verified payment proof",
    time: "2026-06-30 10:35",
    ipAddress: "10.10.2.11",
    userAgent: "Edge / Windows",
    oldValues: '{ "status": "Pending" }',
    newValues: '{ "status": "Approved", "assigned_to": "Staff One" }',
  },
  {
    id: "al-4",
    actor: "Admin",
    role: "Admin",
    action: "MARK_PAID",
    target: "Withdrawal Request",
    targetId: "WD-0005",
    reason: "Payment sent and confirmed",
    time: "2026-06-30 11:20",
    ipAddress: "10.10.2.21",
    userAgent: "Firefox / Linux",
    oldValues: '{ "status": "Approved" }',
    newValues: '{ "status": "Paid" }',
  },
  {
    id: "al-5",
    actor: "System",
    role: "System",
    action: "CLOSE",
    target: "Result Period",
    targetId: "TEST02",
    reason: "Period closed after result entry",
    time: "2026-06-30 15:01",
    ipAddress: "127.0.0.1",
    userAgent: "Flowbit Backend Worker",
    oldValues: '{ "status": "Open" }',
    newValues: '{ "status": "Closed" }',
  },
];

function actionBadgeClass(action: AuditAction) {
  switch (action) {
    case "ENTER_RESULT":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "APPROVE":
      return "bg-green-50 text-green-700 ring-green-200";
    case "MARK_PAID":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "REJECT":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "CLOSE":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "RESERVE_DEPOSIT":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "UPDATE":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "CREATE":
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      {children}
    </div>
  );
}

export function AuditLogsScreen() {
  const [logs] = useState<AuditLog[]>(initialLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [actorFilter, setActorFilter] = useState("All Actors");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [targetFilter, setTargetFilter] = useState("All Targets");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const selectedLog = logs.find((log) => log.id === selectedLogId) ?? null;

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        `${log.actor} ${log.action} ${log.target} ${log.reason}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesAction =
        actionFilter === "All Actions" || log.action === actionFilter;
      const matchesActor =
        actorFilter === "All Actors" || log.role === actorFilter;
      const matchesDate =
        dateFilter === "All Dates" ||
        (dateFilter === "Today" && log.time.startsWith("2026-06-30")) ||
        (dateFilter === "This Week" &&
          log.time >= "2026-06-24" &&
          log.time <= "2026-06-30 23:59") ||
        (dateFilter === "This Month" && log.time.startsWith("2026-06"));
      const matchesTarget =
        targetFilter === "All Targets" || log.target === targetFilter;

      return (
        matchesSearch &&
        matchesAction &&
        matchesActor &&
        matchesDate &&
        matchesTarget
      );
    });
  }, [actionFilter, actorFilter, dateFilter, logs, searchTerm, targetFilter]);

  const columns: TableColumn<AuditLog>[] = [
    {
      key: "actor",
      header: "Actor",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.actor}</span>,
    },
    {
      key: "role",
      header: "Role",
      className: "whitespace-nowrap",
      render: (row) => row.role,
    },
    {
      key: "action",
      header: "Action",
      className: "whitespace-nowrap",
      render: (row) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
            actionBadgeClass(row.action),
          )}
        >
          {row.action}
        </span>
      ),
    },
    {
      key: "target",
      header: "Target",
      className: "whitespace-nowrap",
      render: (row) => row.target,
    },
    {
      key: "targetId",
      header: "Target ID",
      className: "whitespace-nowrap",
      render: (row) => row.targetId,
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => row.reason,
    },
    {
      key: "time",
      header: "Time",
      className: "whitespace-nowrap",
      render: (row) => row.time,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[88px] whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => setSelectedLogId(row.id)}
        >
          View
        </button>
      ),
    },
  ];

  const summaryCards = [
    { title: "Today", value: "18", delta: "Actions", tone: "neutral" as const, detail: "Recorded system activity" },
    { title: "Result Actions", value: "4", delta: "Tracked", tone: "neutral" as const, detail: "Result period and entry changes" },
    { title: "Wallet Actions", value: "9", delta: "Tracked", tone: "warning" as const, detail: "Deposit, withdrawal, and wallet updates" },
    { title: "Settlement Actions", value: "5", delta: "Tracked", tone: "positive" as const, detail: "Settlement approvals and payouts" },
  ];

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Audit Logs
            </h1>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </section>

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.8fr_1fr_1fr_1fr_1fr]">
            <FilterField label="Search">
              <SearchInput
                placeholder="Search audit logs"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </FilterField>
            <FilterField label="Action">
              <DropdownFilter label="Action" options={actionOptions} selectedValue={actionFilter} onChange={setActionFilter} />
            </FilterField>
            <FilterField label="Actor">
              <DropdownFilter label="Actor" options={actorOptions} selectedValue={actorFilter} onChange={setActorFilter} />
            </FilterField>
            <FilterField label="Date">
              <DropdownFilter label="Date" options={dateOptions} selectedValue={dateFilter} onChange={setDateFilter} />
            </FilterField>
            <FilterField label="Target">
              <DropdownFilter label="Target" options={targetOptions} selectedValue={targetFilter} onChange={setTargetFilter} />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title="Audit Log List"
          rows={filteredLogs}
          columns={columns}
          tableClassName="min-w-[1260px]"
        />
      </div>

      <DetailDrawer
        open={selectedLog !== null}
        title="Audit Log Detail"
        subtitle={selectedLog?.targetId}
        onClose={() => setSelectedLogId(null)}
      >
        {selectedLog ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Actor", selectedLog.actor],
                ["Role", selectedLog.role],
                ["Action", selectedLog.action],
                ["Target", selectedLog.target],
                ["Target ID", selectedLog.targetId],
                ["Reason", selectedLog.reason],
                ["IP Address", selectedLog.ipAddress],
                ["User Agent", selectedLog.userAgent],
                ["Created At", selectedLog.time],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[#0f172a] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-300">
                  Old Values
                </p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-slate-100">
                  {selectedLog.oldValues}
                </pre>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[#0f172a] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-300">
                  New Values
                </p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-slate-100">
                  {selectedLog.newValues}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
