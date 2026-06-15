"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { downloadFromApi } from "@/lib/api/client";
import {
  DropdownFilter,
  type DropdownOption,
} from "@/components/ui/DropdownFilter";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatCard } from "@/components/ui/StatCard";
import { getAuditLogs, type ApiAuditLog } from "@/lib/api/audit";
import { ensureResults } from "@/lib/api/types";
import {
  currentMonthString,
  todayDateString,
  weekStartDateString,
} from "@/lib/format";
import type { TableColumn } from "@/lib/types";
import { cn } from "@/lib/utils";

// Values come from the backend audit log, so these stay open strings.
type AuditRole = string;
type AuditAction = string;
type AuditTarget = string;

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

const dateOptions: DropdownOption[] = [
  { label: "All Dates", value: "All Dates" },
  { label: "Today", value: "Today" },
  { label: "This Week", value: "This Week" },
  { label: "This Month", value: "This Month" },
];

// Build "All X" + the distinct values present in the loaded logs.
function buildOptions(allLabel: string, values: string[]): DropdownOption[] {
  const distinct = Array.from(new Set(values.filter(Boolean))).sort();
  return [
    { label: allLabel, value: allLabel },
    ...distinct.map((value) => ({ label: value, value })),
  ];
}

function mapAuditLog(entry: ApiAuditLog): AuditLog {
  return {
    id: String(entry.id),
    actor: entry.actor,
    role: entry.role,
    action: entry.action,
    target: entry.target,
    targetId: entry.target_id,
    reason: entry.reason,
    time: entry.time,
    ipAddress: entry.ip_address || "—",
    userAgent: entry.user_agent || "—",
    oldValues: entry.old_values || "—",
    newValues: entry.new_values || "—",
  };
}

function actionBadgeClass(action: AuditAction) {
  switch (action) {
    case "RESULT_ENTRY":
    case "ENTER_RESULT":
    case "UPDATE":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "APPROVE":
      return "bg-green-50 text-green-700 ring-green-200";
    case "MARK_PAID":
    case "RESERVE_DEPOSIT":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "SETTLEMENT":
    case "CASHOUT":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "REJECT":
    case "VOID":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFromApi("/api/audit/admin/logs/export/", "flowbit-audit-logs.csv");
    } catch {
      setError("Unable to export audit logs.");
    } finally {
      setExporting(false);
    }
  }
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [actorFilter, setActorFilter] = useState("All Actors");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [targetFilter, setTargetFilter] = useState("All Targets");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      try {
        const response = await getAuditLogs();
        if (!active) return;
        setLogs(ensureResults(response).map(mapAuditLog));
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Unable to load audit logs.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLogs();

    return () => {
      active = false;
    };
  }, []);

  const selectedLog = logs.find((log) => log.id === selectedLogId) ?? null;

  const actionOptions = useMemo(
    () => buildOptions("All Actions", logs.map((log) => log.action)),
    [logs],
  );
  const actorOptions = useMemo(
    () => buildOptions("All Actors", logs.map((log) => log.role)),
    [logs],
  );
  const targetOptions = useMemo(
    () => buildOptions("All Targets", logs.map((log) => log.target)),
    [logs],
  );

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
        (dateFilter === "Today" && log.time.startsWith(todayDateString())) ||
        (dateFilter === "This Week" &&
          log.time.slice(0, 10) >= weekStartDateString() &&
          log.time.slice(0, 10) <= todayDateString()) ||
        (dateFilter === "This Month" && log.time.startsWith(currentMonthString()));
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

  const summaryCards = useMemo(() => {
    const today = todayDateString();
    const count = (predicate: (log: AuditLog) => boolean) =>
      String(logs.filter(predicate).length);
    const walletTargets = new Set([
      "Deposit Request",
      "Withdrawal Request",
      "Company Wallet",
    ]);

    return [
      {
        title: "Today",
        value: count((log) => log.time.startsWith(today)),
        delta: "Actions",
        tone: "neutral" as const,
        detail: "Recorded system activity",
      },
      {
        title: "Result Actions",
        value: count((log) => log.target === "Result Period"),
        delta: "Tracked",
        tone: "neutral" as const,
        detail: "Result period and entry changes",
      },
      {
        title: "Wallet Actions",
        value: count((log) => walletTargets.has(log.target)),
        delta: "Tracked",
        tone: "warning" as const,
        detail: "Deposit, withdrawal, and wallet updates",
      },
      {
        title: "Settlement Actions",
        value: count((log) => log.target === "Settlement Batch"),
        delta: "Tracked",
        tone: "positive" as const,
        detail: "Settlement approvals and payouts",
      },
    ];
  }, [logs]);

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Audit Logs
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {loading
                ? "Loading recent activity…"
                : `${logs.length} recent ${logs.length === 1 ? "entry" : "entries"}`}
            </p>
          </div>
          <ActionButton
            variant="secondary"
            disabled={exporting || logs.length === 0}
            onClick={handleExport}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </ActionButton>
        </section>

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
