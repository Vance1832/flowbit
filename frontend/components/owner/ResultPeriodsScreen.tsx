"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useTranslations } from "@/components/providers/LocaleProvider";
import {
  createResultPeriod,
  getAdminResultPeriods,
  updateResultPeriod,
  type ApiResultPeriod,
} from "@/lib/api/ledgers";
import { ensureResults } from "@/lib/api/types";
import { formatDateOnly } from "@/lib/format";
import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { DropdownFilter, type DropdownOption } from "@/components/ui/DropdownFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TableColumn } from "@/lib/types";

// status key → message key; the badge label maps through this.
const STATUS_KEY: Record<string, string> = {
  open: "resultPeriods.statusOpen",
  closed: "resultPeriods.statusClosed",
  settlement_previewed: "resultPeriods.statusSettlementPreviewed",
  settled: "resultPeriods.statusSettled",
  archived: "resultPeriods.statusArchived",
  funding_required: "resultPeriods.statusFundingRequired",
  settlement_approved: "resultPeriods.statusSettlementApproved",
};

function statusTone(status: string) {
  switch (status) {
    case "open":
      return "success" as const;
    case "closed":
      return "neutral" as const;
    case "settlement_previewed":
    case "funding_required":
      return "warning" as const;
    case "settled":
    case "settlement_approved":
      return "info" as const;
    case "archived":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function FieldLabel({ children }: { children: string }) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-[var(--color-foreground)]">
        {children}
      </span>
    </div>
  );
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

const drawerInputClassName =
  "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30";

const emptyForm = {
  code: "",
  name: "",
  bet_type: "3d",
  result_date: "",
  default_close_time: "15:00",
  status: "open",
  is_visible_to_users: true,
};

export function ResultPeriodsScreen() {
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
    { label: t("resultPeriods.allStatus"), value: "all" },
    { label: t("resultPeriods.statusOpen"), value: "open" },
    { label: t("resultPeriods.statusClosed"), value: "closed" },
    { label: t("resultPeriods.statusSettlementPreviewed"), value: "settlement_previewed" },
    { label: t("resultPeriods.statusSettled"), value: "settled" },
    { label: t("resultPeriods.statusArchived"), value: "archived" },
  ];
  const formStatusOptions: DropdownOption[] = statusOptions.filter(
    (option) => option.value !== "all",
  );
  const visibilityOptions: DropdownOption[] = [
    { label: t("resultPeriods.allVisibility"), value: "all" },
    { label: t("resultPeriods.visibleToUsers"), value: "visible" },
    { label: t("resultPeriods.hiddenFromUsers"), value: "hidden" },
  ];
  const resultDateOptions: DropdownOption[] = [
    { label: t("filters.allDates"), value: "all" },
    { label: t("filters.today"), value: "today" },
    { label: t("filters.thisWeek"), value: "week" },
    { label: t("filters.thisMonth"), value: "month" },
  ];
  const betTypeOptions: DropdownOption[] = [
    { label: t("resultPeriods.betType3d"), value: "3d" },
    { label: t("resultPeriods.betType2d"), value: "2d" },
  ];

  const [rows, setRows] = useState<ApiResultPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [resultDateFilter, setResultDateFilter] = useState("all");
  const [formState, setFormState] = useState(emptyForm);

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminResultPeriods();
      setRows(ensureResults(response));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("resultPeriods.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      const timer = window.setTimeout(() => {
        setDrawerMode("create");
        setSelectedId(null);
        setFormState(emptyForm);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [searchParams]);

  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesStatus = activeStatus === "all" || row.status === activeStatus;
      const matchesSearch =
        searchTerm.trim() === "" ||
        `${row.code} ${row.name}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" && row.is_visible_to_users) ||
        (visibilityFilter === "hidden" && !row.is_visible_to_users);
      const matchesDate =
        resultDateFilter === "all" ||
        (resultDateFilter === "today" && row.result_date === "2026-05-20") ||
        (resultDateFilter === "week" && row.result_date.slice(0, 7) === "2026-05") ||
        (resultDateFilter === "month" && row.result_date.slice(0, 7) === "2026-05");

      return matchesStatus && matchesSearch && matchesVisibility && matchesDate;
    });
  }, [activeStatus, resultDateFilter, rows, searchTerm, visibilityFilter]);

  const columns: TableColumn<ApiResultPeriod>[] = [
    {
      key: "code",
      header: t("resultPeriods.colCode"),
      className: "w-[110px] whitespace-nowrap",
      render: (row) => <span className="font-semibold">{row.code}</span>,
    },
    {
      key: "name",
      header: t("resultPeriods.colName"),
      className: "min-w-[180px]",
      render: (row) => row.name,
    },
    {
      key: "resultDate",
      header: t("resultPeriods.colResultDate"),
      className: "whitespace-nowrap",
      render: (row) => formatDateOnly(row.result_date),
    },
    {
      key: "defaultCloseTime",
      header: t("resultPeriods.colDefaultCloseTime"),
      className: "whitespace-nowrap",
      render: (row) => row.default_close_time.slice(0, 5),
    },
    {
      key: "status",
      header: t("resultPeriods.colStatus"),
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
    {
      key: "resultNumber",
      header: t("resultPeriods.colResultNumber"),
      className: "whitespace-nowrap text-center",
      render: (row) => row.result_number ?? "—",
    },
    {
      key: "visible",
      header: t("resultPeriods.colVisible"),
      render: (row) => (
        <StatusBadge status={row.is_visible_to_users ? "success" : "neutral"}>
          {row.is_visible_to_users ? t("resultPeriods.visible") : t("resultPeriods.hidden")}
        </StatusBadge>
      ),
    },
    {
      key: "createdBy",
      header: t("resultPeriods.colCreatedBy"),
      className: "whitespace-nowrap",
      render: (row) =>
        row.created_by_name ?? t("resultPeriods.createdByUser", { id: row.created_by }),
    },
    {
      key: "actions",
      header: t("resultPeriods.colActions"),
      className: "w-[120px] whitespace-nowrap",
      render: (row) => (
        <ActionButton
          variant="ghost"
          className="h-auto px-0 py-0 text-[var(--color-primary)] hover:bg-transparent"
          onClick={() => {
            setSelectedId(row.id);
            setFormState({
              code: row.code,
              name: row.name,
              bet_type: row.bet_type,
              result_date: row.result_date,
              default_close_time: row.default_close_time.slice(0, 5),
              status: row.status,
              is_visible_to_users: row.is_visible_to_users,
            });
            setDrawerMode("edit");
          }}
        >
          {row.status === "open" ? t("resultPeriods.viewEdit") : t("resultPeriods.view")}
        </ActionButton>
      ),
    },
  ];

  async function handleSave() {
    if (!formState.code.trim() || !formState.name.trim() || !formState.result_date.trim()) {
      setFormError(t("resultPeriods.requiredError"));
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (drawerMode === "create") {
        await createResultPeriod(formState);
      } else if (drawerMode === "edit" && selectedRow) {
        await updateResultPeriod(selectedRow.id, formState);
      }
      await loadRows();
      setDrawerMode(null);
      setSelectedId(null);
      setFormState(emptyForm);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : t("resultPeriods.saveError"));
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
              {t("resultPeriods.title")}
            </h1>
          </div>
          <ActionButton
            onClick={() => {
              setSelectedId(null);
              setFormState(emptyForm);
              setDrawerMode("create");
            }}
          >
            {t("resultPeriods.create")}
          </ActionButton>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <FilterField label={t("resultPeriods.filterSearch")}>
              <SearchInput
                placeholder={t("resultPeriods.searchPlaceholder")}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </FilterField>
            <FilterField label={t("common.status")}>
              <DropdownFilter
                label={t("common.status")}
                options={statusOptions}
                selectedValue={activeStatus}
                onChange={setActiveStatus}
              />
            </FilterField>
            <FilterField label={t("resultPeriods.filterResultDate")}>
              <DropdownFilter
                label={t("resultPeriods.filterResultDate")}
                options={resultDateOptions}
                selectedValue={resultDateFilter}
                onChange={setResultDateFilter}
              />
            </FilterField>
            <FilterField label={t("resultPeriods.filterVisibility")}>
              <DropdownFilter
                label={t("resultPeriods.filterVisibility")}
                options={visibilityOptions}
                selectedValue={visibilityFilter}
                onChange={setVisibilityFilter}
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title={t("resultPeriods.tableTitle")}
          rows={filteredRows}
          columns={columns}
          tableClassName="min-w-[1120px]"
          emptyState={
            loading ? (
              <EmptyState title={t("resultPeriods.loadingTitle")} description={t("resultPeriods.loadingDesc")} />
            ) : (
              <EmptyState
                title={t("resultPeriods.emptyTitle")}
                description={t("resultPeriods.emptyDesc")}
                action={
                  <ActionButton
                    onClick={() => {
                      setSelectedId(null);
                      setFormState(emptyForm);
                      setDrawerMode("create");
                    }}
                  >
                    {t("resultPeriods.create")}
                  </ActionButton>
                }
              />
            )
          }
        />
      </div>

      <DetailDrawer
        open={drawerMode !== null}
        title={drawerMode === "create" ? t("resultPeriods.drawerCreateTitle") : t("resultPeriods.drawerEditTitle")}
        subtitle={
          drawerMode === "create"
            ? t("resultPeriods.drawerCreateSubtitle")
            : t("resultPeriods.drawerEditSubtitle", {
                code: selectedRow?.code ?? t("resultPeriods.selectedFallback"),
              })
        }
        onClose={() => {
          setDrawerMode(null);
          setSelectedId(null);
          setFormError("");
        }}
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>{t("resultPeriods.fieldCode")}</FieldLabel>
              <input
                value={formState.code}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, code: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("resultPeriods.fieldName")}</FieldLabel>
              <input
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("resultPeriods.fieldBetType")}</FieldLabel>
              {drawerMode === "edit" ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {t("resultPeriods.betTypeFixed", { type: formState.bet_type.toUpperCase() })}
                </p>
              ) : (
                <DropdownFilter
                  label={t("resultPeriods.fieldBetType")}
                  options={betTypeOptions}
                  selectedValue={formState.bet_type}
                  onChange={(value) =>
                    setFormState((current) => ({ ...current, bet_type: value }))
                  }
                />
              )}
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("resultPeriods.fieldResultDate")}</FieldLabel>
              <input
                type="date"
                value={formState.result_date}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    result_date: event.target.value,
                  }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("resultPeriods.fieldDefaultCloseTime")}</FieldLabel>
              <input
                type="time"
                value={formState.default_close_time}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    default_close_time: event.target.value,
                  }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("resultPeriods.fieldVisibleToUsers")}</FieldLabel>
              <button
                type="button"
                onClick={() =>
                  setFormState((current) => ({
                    ...current,
                    is_visible_to_users: !current.is_visible_to_users,
                  }))
                }
                className={`flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-sm font-medium transition ${
                  formState.is_visible_to_users
                    ? "border-emerald-200 bg-emerald-50 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-muted-foreground)]"
                }`}
              >
                <span>{formState.is_visible_to_users ? t("resultPeriods.visible") : t("resultPeriods.hidden")}</span>
                <span>{formState.is_visible_to_users ? t("resultPeriods.toggleOn") : t("resultPeriods.toggleOff")}</span>
              </button>
              <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                {t("resultPeriods.visibilityHint")}
              </p>
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("resultPeriods.fieldStatus")}</FieldLabel>
              <DropdownFilter
                label={t("resultPeriods.fieldStatus")}
                options={formStatusOptions}
                selectedValue={formState.status}
                onChange={(value) =>
                  setFormState((current) => ({ ...current, status: value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel>{t("resultPeriods.fieldCreatedBy")}</FieldLabel>
              <input
                value={selectedRow?.created_by_name ?? t("resultPeriods.createdByDefault")}
                readOnly
                className={`${drawerInputClassName} bg-[var(--color-surface-subtle)] text-[var(--color-muted-foreground)]`}
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
              {t("resultPeriods.cancel")}
            </ActionButton>
            <ActionButton onClick={handleSave} disabled={saving}>
              {saving ? t("resultPeriods.saving") : t("resultPeriods.save")}
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>
    </>
  );
}
