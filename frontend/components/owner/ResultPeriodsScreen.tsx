"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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

const statusOptions: DropdownOption[] = [
  { label: "All Status", value: "all" },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
  { label: "Settlement Previewed", value: "settlement_previewed" },
  { label: "Settled", value: "settled" },
  { label: "Archived", value: "archived" },
];

const formStatusOptions: DropdownOption[] = statusOptions.filter(
  (option) => option.value !== "all",
);

const visibilityOptions: DropdownOption[] = [
  { label: "All Visibility", value: "all" },
  { label: "Visible to Users", value: "visible" },
  { label: "Hidden from Users", value: "hidden" },
];

const resultDateOptions: DropdownOption[] = [
  { label: "All Dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
];

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

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
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

const betTypeOptions: DropdownOption[] = [
  { label: "3D (three digits)", value: "3d" },
  { label: "2D (two digits)", value: "2d" },
];

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
  const searchParams = useSearchParams();
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
      setError(loadError instanceof Error ? loadError.message : "Unable to load result periods.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);
    return () => window.clearTimeout(timer);
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
      header: "Code",
      className: "w-[110px] whitespace-nowrap",
      render: (row) => <span className="font-semibold">{row.code}</span>,
    },
    {
      key: "name",
      header: "Name",
      className: "min-w-[180px]",
      render: (row) => row.name,
    },
    {
      key: "resultDate",
      header: "Result Date",
      className: "whitespace-nowrap",
      render: (row) => formatDateOnly(row.result_date),
    },
    {
      key: "defaultCloseTime",
      header: "Default Close Time",
      className: "whitespace-nowrap",
      render: (row) => row.default_close_time.slice(0, 5),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
    {
      key: "resultNumber",
      header: "Result Number",
      className: "whitespace-nowrap text-center",
      render: (row) => row.result_number ?? "—",
    },
    {
      key: "visible",
      header: "Visible",
      render: (row) => (
        <StatusBadge status={row.is_visible_to_users ? "success" : "neutral"}>
          {row.is_visible_to_users ? "Visible" : "Hidden"}
        </StatusBadge>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      className: "whitespace-nowrap",
      render: (row) => row.created_by_name ?? `User #${row.created_by}`,
    },
    {
      key: "actions",
      header: "Actions",
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
          {row.status === "open" ? "View/Edit" : "View"}
        </ActionButton>
      ),
    },
  ];

  async function handleSave() {
    if (!formState.code.trim() || !formState.name.trim() || !formState.result_date.trim()) {
      setFormError("Code, name, and result date are required.");
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
      setFormError(saveError instanceof Error ? saveError.message : "Unable to save result period.");
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
              Result Periods
            </h1>
          </div>
          <ActionButton
            onClick={() => {
              setSelectedId(null);
              setFormState(emptyForm);
              setDrawerMode("create");
            }}
          >
            Create Result Period
          </ActionButton>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <FilterField label="Search">
              <SearchInput
                placeholder="Search by code or name"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </FilterField>
            <FilterField label="Status">
              <DropdownFilter
                label="Status"
                options={statusOptions}
                selectedValue={activeStatus}
                onChange={setActiveStatus}
              />
            </FilterField>
            <FilterField label="Result Date">
              <DropdownFilter
                label="Result Date"
                options={resultDateOptions}
                selectedValue={resultDateFilter}
                onChange={setResultDateFilter}
              />
            </FilterField>
            <FilterField label="User Visibility">
              <DropdownFilter
                label="User Visibility"
                options={visibilityOptions}
                selectedValue={visibilityFilter}
                onChange={setVisibilityFilter}
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title="Result Period List"
          rows={filteredRows}
          columns={columns}
          tableClassName="min-w-[1120px]"
          emptyState={
            loading ? (
              <EmptyState title="Loading result periods" description="Fetching result periods from the backend." />
            ) : (
              <EmptyState
                title="No result periods found"
                description="There are no result periods yet. Create the first result period to begin."
                action={
                  <ActionButton
                    onClick={() => {
                      setSelectedId(null);
                      setFormState(emptyForm);
                      setDrawerMode("create");
                    }}
                  >
                    Create Result Period
                  </ActionButton>
                }
              />
            )
          }
        />
      </div>

      <DetailDrawer
        open={drawerMode !== null}
        title={drawerMode === "create" ? "Create Result Period" : "Edit Result Period"}
        subtitle={
          drawerMode === "create"
            ? "Create a new result period."
            : `Manage ${selectedRow?.code ?? "selected result period"}`
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
              <FieldLabel>Code</FieldLabel>
              <input
                value={formState.code}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, code: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Name</FieldLabel>
              <input
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Bet Type</FieldLabel>
              {drawerMode === "edit" ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formState.bet_type.toUpperCase()} (fixed once a period has ledgers)
                </p>
              ) : (
                <DropdownFilter
                  label="Bet Type"
                  options={betTypeOptions}
                  selectedValue={formState.bet_type}
                  onChange={(value) =>
                    setFormState((current) => ({ ...current, bet_type: value }))
                  }
                />
              )}
            </div>
            <div className="space-y-2">
              <FieldLabel>Result Date</FieldLabel>
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
              <FieldLabel>Default Close Time</FieldLabel>
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
              <FieldLabel>Visible to normal users</FieldLabel>
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
                <span>{formState.is_visible_to_users ? "Visible" : "Hidden"}</span>
                <span>{formState.is_visible_to_users ? "On" : "Off"}</span>
              </button>
              <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                Hidden periods are only visible to admin/owner.
              </p>
            </div>
            <div className="space-y-2">
              <FieldLabel>Status</FieldLabel>
              <DropdownFilter
                label="Status"
                options={formStatusOptions}
                selectedValue={formState.status}
                onChange={(value) =>
                  setFormState((current) => ({ ...current, status: value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel>Created By</FieldLabel>
              <input
                value={selectedRow?.created_by_name ?? "Current authenticated user"}
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
              Cancel
            </ActionButton>
            <ActionButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>
    </>
  );
}
