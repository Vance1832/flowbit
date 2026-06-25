"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
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
import { getAuditLogs, verifyAuditChain, type ApiAuditLog } from "@/lib/api/audit";
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

// Build "All X" + the distinct values present in the loaded logs. The sentinel
// `allValue` stays in English so the filter comparisons keep working; only the
// displayed `allLabel` is localized.
function buildOptions(allLabel: string, allValue: string, values: string[]): DropdownOption[] {
  const distinct = Array.from(new Set(values.filter(Boolean))).sort();
  return [
    { label: allLabel, value: allValue },
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
  const t = useTranslations();
  const dateOptions: DropdownOption[] = [
    { label: t("filters.allDates"), value: "All Dates" },
    { label: t("filters.today"), value: "Today" },
    { label: t("filters.thisWeek"), value: "This Week" },
    { label: t("filters.thisMonth"), value: "This Month" },
  ];
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [chainStatus, setChainStatus] = useState<
    { ok: boolean; message: string } | null
  >(null);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFromApi("/api/audit/admin/logs/export/", "flowbit-audit-logs.csv");
    } catch {
      setError(t("audit.exportError"));
    } finally {
      setExporting(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setChainStatus(null);
    try {
      const result = await verifyAuditChain();
      setChainStatus(
        result.ok
          ? {
              ok: true,
              message: t("audit.verifyOk", { count: result.count.toLocaleString() }),
            }
          : {
              ok: false,
              message: t("audit.verifyBroken", {
                count: result.broken_ids.length,
                plural: result.broken_ids.length === 1 ? "y" : "ies",
                ids: result.broken_ids.join(", "),
              }),
            },
      );
    } catch {
      setError(t("audit.verifyError"));
    } finally {
      setVerifying(false);
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
        const { logs: rows, total, truncated: wasTruncated } = await getAuditLogs();
        if (!active) return;
        setLogs(rows.map(mapAuditLog));
        setTotalCount(total);
        setTruncated(wasTruncated);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : t("audit.loadError"),
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLogs();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedLog = logs.find((log) => log.id === selectedLogId) ?? null;

  const actionOptions = useMemo(
    () => buildOptions(t("audit.allActions"), "All Actions", logs.map((log) => log.action)),
    [logs, t],
  );
  const actorOptions = useMemo(
    () => buildOptions(t("audit.allActors"), "All Actors", logs.map((log) => log.role)),
    [logs, t],
  );
  const targetOptions = useMemo(
    () => buildOptions(t("audit.allTargets"), "All Targets", logs.map((log) => log.target)),
    [logs, t],
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
      header: t("audit.colActor"),
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.actor}</span>,
    },
    {
      key: "role",
      header: t("audit.colRole"),
      className: "whitespace-nowrap",
      render: (row) => row.role,
    },
    {
      key: "action",
      header: t("audit.colAction"),
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
      header: t("audit.colTarget"),
      className: "whitespace-nowrap",
      render: (row) => row.target,
    },
    {
      key: "targetId",
      header: t("audit.colTargetId"),
      className: "whitespace-nowrap",
      render: (row) => row.targetId,
    },
    {
      key: "reason",
      header: t("audit.colReason"),
      render: (row) => row.reason,
    },
    {
      key: "time",
      header: t("audit.colTime"),
      className: "whitespace-nowrap",
      render: (row) => row.time,
    },
    {
      key: "actions",
      header: t("audit.colActions"),
      className: "w-[88px] whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => setSelectedLogId(row.id)}
        >
          {t("common.view")}
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
        title: t("audit.cardToday"),
        value: count((log) => log.time.startsWith(today)),
        delta: t("audit.actions"),
        tone: "neutral" as const,
        detail: t("audit.recordedActivity"),
      },
      {
        title: t("audit.cardResultActions"),
        value: count((log) => log.target === "Result Period"),
        delta: t("audit.tracked"),
        tone: "neutral" as const,
        detail: t("audit.resultActionsDetail"),
      },
      {
        title: t("audit.cardWalletActions"),
        value: count((log) => walletTargets.has(log.target)),
        delta: t("audit.tracked"),
        tone: "warning" as const,
        detail: t("audit.walletActionsDetail"),
      },
      {
        title: t("audit.cardSettlementActions"),
        value: count((log) => log.target === "Settlement Batch"),
        delta: t("audit.tracked"),
        tone: "positive" as const,
        detail: t("audit.settlementActionsDetail"),
      },
    ];
  }, [logs, t]);

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              {t("audit.title")}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {loading
                ? t("audit.loadingActivity")
                : truncated
                  ? t("audit.subtitleTruncated", {
                      shown: logs.length.toLocaleString(),
                      total: totalCount.toLocaleString(),
                    })
                  : t("audit.subtitleCount", {
                      count: totalCount.toLocaleString(),
                      plural: totalCount === 1 ? "y" : "ies",
                    })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              variant="secondary"
              disabled={verifying}
              onClick={handleVerify}
            >
              {verifying ? t("audit.verifying") : t("audit.verify")}
            </ActionButton>
            <ActionButton
              variant="secondary"
              disabled={exporting || logs.length === 0}
              onClick={handleExport}
            >
              {exporting ? t("audit.exporting") : t("audit.exportCsv")}
            </ActionButton>
          </div>
        </section>

        {chainStatus ? (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              chainStatus.ok
                ? "border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]"
                : "border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] text-[var(--badge-danger-fg)]",
            )}
          >
            {chainStatus.message}
          </div>
        ) : null}

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
            <FilterField label={t("audit.filterSearch")}>
              <SearchInput
                placeholder={t("audit.searchPlaceholder")}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </FilterField>
            <FilterField label={t("audit.colAction")}>
              <DropdownFilter label={t("audit.colAction")} options={actionOptions} selectedValue={actionFilter} onChange={setActionFilter} />
            </FilterField>
            <FilterField label={t("audit.colActor")}>
              <DropdownFilter label={t("audit.colActor")} options={actorOptions} selectedValue={actorFilter} onChange={setActorFilter} />
            </FilterField>
            <FilterField label={t("common.date")}>
              <DropdownFilter label={t("common.date")} options={dateOptions} selectedValue={dateFilter} onChange={setDateFilter} />
            </FilterField>
            <FilterField label={t("audit.filterTarget")}>
              <DropdownFilter label={t("audit.filterTarget")} options={targetOptions} selectedValue={targetFilter} onChange={setTargetFilter} />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title={t("audit.tableTitle")}
          rows={filteredLogs}
          columns={columns}
          tableClassName="min-w-[1260px]"
        />
      </div>

      <DetailDrawer
        open={selectedLog !== null}
        title={t("audit.detailTitle")}
        subtitle={selectedLog?.targetId}
        onClose={() => setSelectedLogId(null)}
      >
        {selectedLog ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [t("audit.colActor"), selectedLog.actor],
                [t("audit.colRole"), selectedLog.role],
                [t("audit.colAction"), selectedLog.action],
                [t("audit.colTarget"), selectedLog.target],
                [t("audit.colTargetId"), selectedLog.targetId],
                [t("audit.colReason"), selectedLog.reason],
                [t("audit.detailIp"), selectedLog.ipAddress],
                [t("audit.detailUserAgent"), selectedLog.userAgent],
                [t("audit.detailCreatedAt"), selectedLog.time],
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
                  {t("audit.oldValues")}
                </p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-slate-100">
                  {selectedLog.oldValues}
                </pre>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[#0f172a] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-300">
                  {t("audit.newValues")}
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
