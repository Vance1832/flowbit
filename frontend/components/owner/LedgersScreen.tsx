"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import {
  DropdownFilter,
  type DropdownOption,
} from "@/components/ui/DropdownFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createLedger,
  getAdminLedgers,
  getAdminResultPeriods,
  getLedgerNumbers,
  updateLedger,
  type ApiLedger,
  type ApiLedgerNumber,
  type ApiResultPeriod,
} from "@/lib/api/ledgers";
import { ensureResults, type PaginatedResponse } from "@/lib/api/types";
import { formatDateTime, formatMmkAmount, formatTimeOnly } from "@/lib/format";
import type { TableColumn } from "@/lib/types";

type LedgerFormState = {
  result_period: string;
  name: string;
  capacity_per_number: string;
  settlement_rate: string;
  priority_order: string;
  open_at: string;
  close_at: string;
  status: string;
};

type CapacitySummary = {
  totalNumbers: number;
  totalUsed: number;
  totalRemaining: number;
  rows: ApiLedgerNumber[];
};

// status key → message key; the badge label maps through this.
const STATUS_KEY: Record<string, string> = {
  open: "ledgers.statusOpen",
  closed: "ledgers.statusClosed",
  settled: "ledgers.statusSettled",
  archived: "ledgers.statusArchived",
};

const ranges = [
  "000–099",
  "100–199",
  "200–299",
  "300–399",
  "400–499",
  "500–599",
  "600–699",
  "700–799",
  "800–899",
  "900–999",
];

const drawerInputClassName =
  "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30";

function statusTone(status: string) {
  switch (status) {
    case "open":
      return "success" as const;
    case "closed":
      return "neutral" as const;
    case "settled":
      return "info" as const;
    case "archived":
      return "danger" as const;
    default:
      return "neutral" as const;
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

function FieldLabel({
  children,
  helper,
}: {
  children: string;
  helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-[var(--color-foreground)]">
        {children}
      </span>
      {helper ? (
        <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">{helper}</p>
      ) : null}
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
          : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

function emptyForm(resultPeriodId = ""): LedgerFormState {
  return {
    result_period: resultPeriodId,
    name: "",
    capacity_per_number: "",
    settlement_rate: "700",
    priority_order: "1",
    open_at: "",
    close_at: "",
    status: "open",
  };
}

function toLocalDateTimeInput(value: string) {
  const normalized = formatDateTime(value);
  return normalized === "—" ? "" : normalized.replace(" ", "T");
}

function toApiDateTime(value: string) {
  return value ? `${value}:00Z` : "";
}

export function LedgersScreen() {
  const t = useTranslations();
  const searchParams = useSearchParams();

  const statusLabel = (status: string) =>
    STATUS_KEY[status]
      ? t(STATUS_KEY[status])
      : status
          .split("_")
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(" ");

  const statusOptions: DropdownOption[] = [
    { label: t("ledgers.allStatus"), value: "all" },
    { label: t("ledgers.statusOpen"), value: "open" },
    { label: t("ledgers.statusClosed"), value: "closed" },
    { label: t("ledgers.statusSettled"), value: "settled" },
    { label: t("ledgers.statusArchived"), value: "archived" },
  ];
  const priorityOptions: DropdownOption[] = [
    { label: t("ledgers.allPriority"), value: "all" },
    { label: t("ledgers.priorityN", { n: 1 }), value: "1" },
    { label: t("ledgers.priorityN", { n: 2 }), value: "2" },
    { label: t("ledgers.priorityN", { n: 3 }), value: "3" },
    { label: t("ledgers.priority4plus"), value: "4+" },
  ];

  const [rows, setRows] = useState<ApiLedger[]>([]);
  const [resultPeriods, setResultPeriods] = useState<ApiResultPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | null>(null);
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(null);
  const [formState, setFormState] = useState<LedgerFormState>(emptyForm());
  const [searchTerm, setSearchTerm] = useState("");
  const [resultPeriodFilter, setResultPeriodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [capacitySearch, setCapacitySearch] = useState("");
  const [activeRange, setActiveRange] = useState("000–099");
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [capacityError, setCapacityError] = useState("");
  const [capacitySummary, setCapacitySummary] = useState<CapacitySummary | null>(null);

  const selectedLedger = rows.find((ledger) => ledger.id === selectedLedgerId) ?? null;

  const resultPeriodOptions = useMemo<DropdownOption[]>(() => {
    return [
      { label: t("ledgers.allResultPeriods"), value: "all" },
      ...resultPeriods.map((period) => ({ label: period.code, value: String(period.id) })),
    ];
  }, [resultPeriods, t]);

  const drawerStatusOptions = statusOptions.filter((option) => option.value !== "all");

  const drawerResultPeriodOptions = useMemo<DropdownOption[]>(() => {
    return resultPeriods.map((period) => ({
      label: `${period.code} — ${period.name}`,
      value: String(period.id),
    }));
  }, [resultPeriods]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [ledgerResponse, resultPeriodResponse] = await Promise.all([
        getAdminLedgers(),
        getAdminResultPeriods(),
      ]);
      setRows(ensureResults(ledgerResponse));
      setResultPeriods(ensureResults(resultPeriodResponse));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("ledgers.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      const timer = window.setTimeout(() => {
        setDrawerMode("create");
        setSelectedLedgerId(null);
        setFormState(emptyForm(resultPeriods[0] ? String(resultPeriods[0].id) : ""));
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [resultPeriods, searchParams]);

  useEffect(() => {
    if (!selectedLedgerId) {
      const timer = window.setTimeout(() => {
        setCapacitySummary(null);
        setCapacityError("");
        setCapacitySearch("");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const ledgerId = selectedLedgerId;
    let active = true;

    async function loadCapacity() {
      setCapacityLoading(true);
      setCapacityError("");
      try {
        const response = (await getLedgerNumbers(ledgerId)) as
          | PaginatedResponse<ApiLedgerNumber>
          | ApiLedgerNumber[];
        if (!active) return;

        const rows = ensureResults(response);
        const totalNumbers = Array.isArray(response) ? response.length : response.count;
        const totalUsed = rows.reduce((sum, row) => sum + Number(row.used_amount), 0);
        const totalRemaining = rows.reduce((sum, row) => sum + Number(row.remaining_amount), 0);

        setCapacitySummary({
          totalNumbers,
          totalUsed,
          totalRemaining,
          rows,
        });
      } catch (loadError) {
        if (!active) return;
        setCapacityError(
          loadError instanceof Error ? loadError.message : t("ledgers.capacityLoadError"),
        );
      } finally {
        if (active) {
          setCapacityLoading(false);
        }
      }
    }

    void loadCapacity();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLedgerId]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        `${row.result_period_code ?? ""} ${row.name}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPeriod =
        resultPeriodFilter === "all" || String(row.result_period) === resultPeriodFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" ||
        (priorityFilter === "4+" ? row.priority_order >= 4 : String(row.priority_order) === priorityFilter);
      return matchesSearch && matchesPeriod && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, resultPeriodFilter, rows, searchTerm, statusFilter]);

  const visibleCapacityRows = useMemo(() => {
    if (!capacitySummary) return [];

    const [rangeStartRaw, rangeEndRaw] = activeRange.split("–");
    const rangeStart = Number(rangeStartRaw);
    const rangeEnd = Number(rangeEndRaw);
    const query = capacitySearch.trim();

    return capacitySummary.rows.filter((row) => {
      const codeNumber = Number(row.number_code);
      const inRange = codeNumber >= rangeStart && codeNumber <= rangeEnd;
      const matchesSearch = query === "" || row.number_code.includes(query);
      return inRange && matchesSearch;
    });
  }, [activeRange, capacitySearch, capacitySummary]);

  const columns: TableColumn<ApiLedger>[] = [
    {
      key: "resultPeriod",
      header: t("ledgers.colResultPeriod"),
      className: "whitespace-nowrap",
      render: (row) => <span className="font-semibold">{row.result_period_code ?? row.result_period}</span>,
    },
    {
      key: "ledgerName",
      header: t("ledgers.colLedgerName"),
      className: "min-w-[180px] whitespace-nowrap",
      render: (row) => row.name,
    },
    {
      key: "capacityPerNumber",
      header: t("ledgers.colCapacityPerNumber"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.capacity_per_number),
    },
    {
      key: "settlementRate",
      header: t("ledgers.colSettlementRate"),
      className: "w-24 whitespace-nowrap text-center",
      render: (row) => Number(row.settlement_rate).toLocaleString("en-US"),
    },
    {
      key: "priorityOrder",
      header: t("ledgers.colPriorityOrder"),
      className: "w-24 whitespace-nowrap text-center",
      render: (row) => row.priority_order,
    },
    {
      key: "openTime",
      header: t("ledgers.colOpenTime"),
      className: "w-24 whitespace-nowrap text-center",
      render: (row) => formatTimeOnly(row.open_at),
    },
    {
      key: "closeTime",
      header: t("ledgers.colCloseTime"),
      className: "w-24 whitespace-nowrap text-center",
      render: (row) => formatTimeOnly(row.close_at),
    },
    {
      key: "status",
      header: t("ledgers.colStatus"),
      className: "w-28 whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: t("ledgers.colActions"),
      className: "w-[190px] whitespace-nowrap",
      render: (row) => (
        <div className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
          <button
            type="button"
            className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            onClick={() => setSelectedLedgerId(row.id)}
          >
            {t("ledgers.viewCapacity")}
          </button>
          <span className="text-[var(--color-border-strong)]">|</span>
          <button
            type="button"
            className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            onClick={() => {
              setFormState({
                result_period: String(row.result_period),
                name: row.name,
                capacity_per_number: String(Number(row.capacity_per_number)),
                settlement_rate: String(Number(row.settlement_rate)),
                priority_order: String(row.priority_order),
                open_at: toLocalDateTimeInput(row.open_at),
                close_at: toLocalDateTimeInput(row.close_at),
                status: row.status,
              });
              setDrawerMode("edit");
              setSelectedLedgerId(row.id);
            }}
          >
            {t("ledgers.edit")}
          </button>
        </div>
      ),
    },
  ];

  async function handleSave() {
    if (
      !formState.result_period ||
      !formState.name.trim() ||
      !formState.capacity_per_number.trim() ||
      !formState.settlement_rate.trim() ||
      !formState.priority_order.trim() ||
      !formState.open_at ||
      !formState.close_at
    ) {
      setFormError(t("ledgers.requiredError"));
      return;
    }

    const payload = {
      result_period: Number(formState.result_period),
      name: formState.name.trim(),
      capacity_per_number: Number(formState.capacity_per_number),
      settlement_rate: Number(formState.settlement_rate),
      priority_order: Number(formState.priority_order),
      open_at: toApiDateTime(formState.open_at),
      close_at: toApiDateTime(formState.close_at),
      status: formState.status,
    };

    setSaving(true);
    setFormError("");
    try {
      if (drawerMode === "create") {
        await createLedger(payload);
      } else if (drawerMode === "edit" && selectedLedger) {
        await updateLedger(selectedLedger.id, payload);
      }
      await loadData();
      setDrawerMode(null);
      setFormState(emptyForm(resultPeriods[0] ? String(resultPeriods[0].id) : ""));
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : t("ledgers.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              {t("ledgers.title")}
            </h1>
          </div>
          <ActionButton
            onClick={() => {
              setDrawerMode("create");
              setSelectedLedgerId(null);
              setFormError("");
              setFormState(emptyForm(resultPeriods[0] ? String(resultPeriods[0].id) : ""));
            }}
          >
            {t("ledgers.create")}
          </ActionButton>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <FilterField label={t("ledgers.filterSearch")}>
              <SearchInput
                placeholder={t("ledgers.searchPlaceholder")}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </FilterField>
            <FilterField label={t("ledgers.resultPeriod")}>
              <DropdownFilter
                label={t("ledgers.resultPeriod")}
                options={resultPeriodOptions}
                selectedValue={resultPeriodFilter}
                onChange={setResultPeriodFilter}
              />
            </FilterField>
            <FilterField label={t("common.status")}>
              <DropdownFilter
                label={t("common.status")}
                options={statusOptions}
                selectedValue={statusFilter}
                onChange={setStatusFilter}
              />
            </FilterField>
            <FilterField label={t("ledgers.filterPriority")}>
              <DropdownFilter
                label={t("ledgers.filterPriority")}
                options={priorityOptions}
                selectedValue={priorityFilter}
                onChange={setPriorityFilter}
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title={t("ledgers.tableTitle")}
          description={t("ledgers.tableDesc")}
          rows={filteredRows}
          columns={columns}
          tableClassName="min-w-[1160px] table-fixed"
          emptyState={
            loading ? (
              <EmptyState title={t("ledgers.loadingTitle")} description={t("ledgers.loadingDesc")} />
            ) : (
              <EmptyState
                title={t("ledgers.emptyTitle")}
                description={t("ledgers.emptyDesc")}
                action={
                  <ActionButton
                    onClick={() => {
                      setDrawerMode("create");
                      setFormState(emptyForm(resultPeriods[0] ? String(resultPeriods[0].id) : ""));
                    }}
                  >
                    {t("ledgers.create")}
                  </ActionButton>
                }
              />
            )
          }
        />
      </div>

      <DetailDrawer
        open={drawerMode !== null}
        title={drawerMode === "create" ? t("ledgers.drawerCreateTitle") : t("ledgers.drawerEditTitle")}
        subtitle={
          drawerMode === "create"
            ? t("ledgers.drawerCreateSubtitle")
            : selectedLedger?.name ?? t("ledgers.drawerEditFallback")
        }
        onClose={() => {
          setDrawerMode(null);
          setFormState(emptyForm(resultPeriods[0] ? String(resultPeriods[0].id) : ""));
          setFormError("");
        }}
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>{t("ledgers.fieldResultPeriod")}</FieldLabel>
              <DropdownFilter
                label={t("ledgers.fieldResultPeriod")}
                options={drawerResultPeriodOptions}
                selectedValue={formState.result_period}
                onChange={(value) =>
                  setFormState((current) => ({ ...current, result_period: value }))
                }
                placeholder={t("ledgers.selectResultPeriod")}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("ledgers.fieldLedgerName")}</FieldLabel>
              <input
                type="text"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel helper={t("ledgers.fieldCapacityHelper")}>
                {t("ledgers.fieldCapacityPerNumber")}
              </FieldLabel>
              <input
                type="text"
                value={formState.capacity_per_number}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    capacity_per_number: event.target.value.replace(/[^\d.]/g, ""),
                  }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel helper={t("ledgers.fieldSettlementHelper")}>
                {t("ledgers.fieldSettlementRate")}
              </FieldLabel>
              <input
                type="text"
                value={formState.settlement_rate}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    settlement_rate: event.target.value.replace(/[^\d.]/g, ""),
                  }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel helper={t("ledgers.fieldPriorityHelper")}>
                {t("ledgers.fieldPriorityOrder")}
              </FieldLabel>
              <input
                type="number"
                value={formState.priority_order}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    priority_order: event.target.value,
                  }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("ledgers.fieldStatus")}</FieldLabel>
              <DropdownFilter
                label={t("ledgers.fieldStatus")}
                options={drawerStatusOptions}
                selectedValue={formState.status}
                onChange={(value) => setFormState((current) => ({ ...current, status: value }))}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("ledgers.fieldOpenTime")}</FieldLabel>
              <input
                type="datetime-local"
                value={formState.open_at}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, open_at: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("ledgers.fieldCloseTime")}</FieldLabel>
              <input
                type="datetime-local"
                value={formState.close_at}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, close_at: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
          </div>

          {formError ? (
            <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
            <ActionButton variant="secondary" onClick={() => setDrawerMode(null)}>
              {t("ledgers.cancel")}
            </ActionButton>
            <ActionButton onClick={handleSave} disabled={saving}>
              {saving ? t("ledgers.saving") : t("ledgers.save")}
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={selectedLedger !== null}
        title={t("ledgers.capacityTitle", { name: selectedLedger?.name ?? t("ledgers.ledgerFallback") })}
        subtitle={selectedLedger?.result_period_code}
        onClose={() => {
          setSelectedLedgerId(null);
          setCapacitySummary(null);
        }}
      >
        {selectedLedger ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
              {t("ledgers.capacityIntro")}
            </p>

            {capacityError ? (
              <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
                {capacityError}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  {t("ledgers.totalNumbers")}
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                  {capacitySummary?.totalNumbers ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  {t("ledgers.capacityPerNumber")}
                </p>
                <p className="mt-1 whitespace-nowrap text-lg font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(selectedLedger.capacity_per_number)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  {t("ledgers.totalUsed")}
                </p>
                <p className="mt-1 whitespace-nowrap text-lg font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(capacitySummary?.totalUsed ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  {t("ledgers.remainingCapacity")}
                </p>
                <p className="mt-1 whitespace-nowrap text-lg font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(capacitySummary?.totalRemaining ?? 0)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <input
                  type="search"
                  placeholder={t("ledgers.capacitySearchPlaceholder")}
                  value={capacitySearch}
                  onChange={(event) => setCapacitySearch(event.target.value)}
                  className="h-10 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                />
              </div>
              <div className="flex flex-wrap gap-2 px-4 py-3">
                {ranges.map((range) => (
                  <FilterButton
                    key={range}
                    active={activeRange === range}
                    onClick={() => setActiveRange(range)}
                  >
                    {range}
                  </FilterButton>
                ))}
              </div>
              <div className="grid gap-3 border-t border-[var(--color-border)] p-4">
                {capacityLoading ? (
                  <div className="text-sm text-[var(--color-muted-foreground)]">
                    {t("ledgers.capacityLoading")}
                  </div>
                ) : visibleCapacityRows.length === 0 ? (
                  <div className="text-sm text-[var(--color-muted-foreground)]">
                    {t("ledgers.noCapacityRows")}
                  </div>
                ) : (
                  visibleCapacityRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 md:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_120px]"
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                          {t("ledgers.number")}
                        </p>
                        <p className="mt-1 text-base font-semibold text-[var(--color-foreground)]">
                          {row.number_code}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                          {t("ledgers.used")}
                        </p>
                        <p className="mt-1 whitespace-nowrap text-sm font-medium text-[var(--color-foreground)]">
                          {formatMmkAmount(row.used_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                          {t("ledgers.remaining")}
                        </p>
                        <p className="mt-1 whitespace-nowrap text-sm font-medium text-[var(--color-foreground)]">
                          {formatMmkAmount(row.remaining_amount)}
                        </p>
                      </div>
                      <div className="flex items-center md:justify-end">
                        <StatusBadge status="success">{t("ledgers.available")}</StatusBadge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
