"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import {
  DropdownFilter,
  type DropdownOption,
} from "@/components/ui/DropdownFilter";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TableColumn } from "@/lib/types";

type ResultPeriodStatus =
  | "Open"
  | "Closed"
  | "Settlement Previewed"
  | "Settled"
  | "Archived";

type ResultPeriodRow = {
  id: string;
  code: string;
  name: string;
  resultDate: string;
  defaultCloseTime: string;
  status: ResultPeriodStatus;
  resultNumber: string | null;
  visible: boolean;
  createdBy: string;
};

const statusOptions: DropdownOption[] = [
  { label: "All Status", value: "All" },
  { label: "Open", value: "Open" },
  { label: "Closed", value: "Closed" },
  { label: "Settlement Previewed", value: "Settlement Previewed" },
  { label: "Settled", value: "Settled" },
  { label: "Archived", value: "Archived" },
];

const formStatusOptions: DropdownOption[] = [
  { label: "Open", value: "Open" },
  { label: "Closed", value: "Closed" },
  { label: "Settlement Previewed", value: "Settlement Previewed" },
  { label: "Settled", value: "Settled" },
  { label: "Archived", value: "Archived" },
];

const resultDateOptions: DropdownOption[] = [
  { label: "All Dates", value: "All Dates" },
  { label: "Today", value: "Today" },
  { label: "This Week", value: "This Week" },
  { label: "This Month", value: "This Month" },
];

const resultPeriodRows: ResultPeriodRow[] = [
  {
    id: "rp-1",
    code: "TEST02",
    name: "Test Period 02",
    resultDate: "2026-06-30",
    defaultCloseTime: "15:00",
    status: "Open",
    resultNumber: null,
    visible: true,
    createdBy: "Owner",
  },
  {
    id: "rp-2",
    code: "JUNE01",
    name: "June 1 Period",
    resultDate: "2026-06-01",
    defaultCloseTime: "15:00",
    status: "Settled",
    resultNumber: "124",
    visible: true,
    createdBy: "Owner",
  },
  {
    id: "rp-3",
    code: "MAY16",
    name: "May 16 Period",
    resultDate: "2026-05-16",
    defaultCloseTime: "15:00",
    status: "Settled",
    resultNumber: "387",
    visible: true,
    createdBy: "Admin",
  },
];

const emptyPeriodForm: ResultPeriodRow = {
  id: "",
  code: "",
  name: "",
  resultDate: "2026-06-30",
  defaultCloseTime: "15:00",
  status: "Open",
  resultNumber: null,
  visible: true,
  createdBy: "Owner",
};

function periodTone(status: ResultPeriodStatus) {
  switch (status) {
    case "Open":
      return "success";
    case "Closed":
      return "neutral";
    case "Settlement Previewed":
      return "warning";
    case "Settled":
      return "info";
    case "Archived":
      return "danger";
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
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      {children}
      {helper ? (
        <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

const drawerInputClassName =
  "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30";

export function ResultPeriodsScreen() {
  const [rows, setRows] = useState<ResultPeriodRow[]>(resultPeriodRows);
  const [activeStatus, setActiveStatus] = useState<"All" | ResultPeriodStatus>("All");
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("All Visibility");
  const [resultDateFilter, setResultDateFilter] = useState("All Dates");
  const [formState, setFormState] = useState<ResultPeriodRow>(emptyPeriodForm);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesStatus = activeStatus === "All" || row.status === activeStatus;
      const matchesSearch =
        searchTerm.trim() === "" ||
        `${row.code} ${row.name}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVisibility =
        visibilityFilter === "All Visibility" ||
        (visibilityFilter === "Visible" && row.visible) ||
        (visibilityFilter === "Hidden" && !row.visible);
      const matchesDate =
        resultDateFilter === "All Dates" ||
        (resultDateFilter === "Today" && row.resultDate === "2026-05-20") ||
        (resultDateFilter === "This Week" &&
          row.resultDate >= "2026-05-18" &&
          row.resultDate <= "2026-05-24") ||
        (resultDateFilter === "This Month" && row.resultDate.startsWith("2026-05"));

      return matchesStatus && matchesSearch && matchesVisibility && matchesDate;
    });
  }, [activeStatus, resultDateFilter, rows, searchTerm, visibilityFilter]);

  const columns: TableColumn<ResultPeriodRow>[] = [
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
      render: (row) => row.resultDate,
    },
    {
      key: "defaultCloseTime",
      header: "Default Close Time",
      className: "whitespace-nowrap",
      render: (row) => row.defaultCloseTime,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge status={periodTone(row.status)}>{row.status}</StatusBadge>
      ),
    },
    {
      key: "resultNumber",
      header: "Result Number",
      className: "whitespace-nowrap text-center",
      render: (row) => row.resultNumber ?? "—",
    },
    {
      key: "visible",
      header: "Visible",
      render: (row) => (
        <StatusBadge status={row.visible ? "success" : "neutral"}>
          {row.visible ? "Visible" : "Hidden"}
        </StatusBadge>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      className: "whitespace-nowrap",
      render: (row) => row.createdBy,
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
            setFormState(row);
            setDrawerMode("edit");
          }}
        >
          {row.status === "Open" ? "View/Edit" : "View"}
        </ActionButton>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Result Periods
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Manage result periods, close times, visibility, and result status
            </p>
          </div>
          <ActionButton
            onClick={() => {
              setFormState({
                ...emptyPeriodForm,
                id: `rp-${Date.now()}`,
              });
              setDrawerMode("create");
            }}
          >
            Create Result Period
          </ActionButton>
        </section>

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr] xl:items-center">
            <FilterField label="Search">
              <SearchInput
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by code or name"
              />
            </FilterField>
            <FilterField label="Status">
              <DropdownFilter
                label="Status"
                options={statusOptions}
                selectedValue={activeStatus}
                onChange={(value) => setActiveStatus(value as "All" | ResultPeriodStatus)}
                placeholder="All Status"
              />
            </FilterField>
            <FilterField label="Result Date">
              <DropdownFilter
                label="Result Date"
                options={resultDateOptions}
                selectedValue={resultDateFilter}
                onChange={setResultDateFilter}
                placeholder="All Dates"
              />
            </FilterField>
            <FilterField label="User Visibility">
              <DropdownFilter
                label="User Visibility"
                options={[
                  { label: "All Visibility", value: "All Visibility" },
                  { label: "Visible to Users", value: "Visible" },
                  { label: "Hidden from Users", value: "Hidden" },
                ]}
                selectedValue={visibilityFilter}
                onChange={setVisibilityFilter}
                placeholder="All Visibility"
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title="Result Period List"
          description="Current and past result periods from the owner/admin workflow."
          rows={filteredRows}
          columns={columns}
          tableClassName="min-w-[1120px]"
        />
      </div>

      <DetailDrawer
        open={drawerMode !== null}
        title={drawerMode === "create" ? "Create Result Period" : "Edit Result Period"}
        subtitle={drawerMode === "create" ? "Owner" : formState.code}
        onClose={() => {
          setDrawerMode(null);
          setFormState(emptyPeriodForm);
        }}
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>Code</FieldLabel>
              <input
                type="text"
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
                type="text"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Result Date</FieldLabel>
              <input
                type="date"
                value={formState.resultDate}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, resultDate: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Default Close Time</FieldLabel>
              <input
                type="time"
                value={formState.defaultCloseTime}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    defaultCloseTime: event.target.value,
                  }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Visibility</FieldLabel>
              <label className="flex h-11 items-center justify-between rounded-2xl border border-[var(--color-border)] px-4">
                <span className="text-sm text-[var(--color-foreground)]">
                  Visible to normal users
                </span>
                <input
                  type="checkbox"
                  checked={formState.visible}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, visible: event.target.checked }))
                  }
                  className="h-4 w-4"
                />
              </label>
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
                  setFormState((current) => ({
                    ...current,
                    status: value as ResultPeriodStatus,
                  }))
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Created By
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
              {formState.createdBy}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <ActionButton
              variant="secondary"
              onClick={() => {
                setDrawerMode(null);
                setFormState(emptyPeriodForm);
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton
              onClick={() => {
                if (drawerMode === "create") {
                  setRows((current) => [
                    {
                      ...formState,
                      id: formState.id || `rp-${Date.now()}`,
                    },
                    ...current,
                  ]);
                } else {
                  setRows((current) =>
                    current.map((row) => (row.id === formState.id ? formState : row)),
                  );
                }
                setDrawerMode(null);
                setFormState(emptyPeriodForm);
              }}
            >
              Save
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>
    </>
  );
}
