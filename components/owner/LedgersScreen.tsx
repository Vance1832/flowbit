"use client";

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
import { cn } from "@/lib/utils";

type LedgerStatus = "Open" | "Closed";

type LedgerRow = {
  id: string;
  resultPeriod: string;
  ledgerName: string;
  capacityPerNumber: string;
  settlementRate: string;
  priorityOrder: number;
  openTime: string;
  closeTime: string;
  status: LedgerStatus;
};

type CapacityRow = {
  number: string;
  used: string;
  remaining: string;
  status: "Available";
};

const ledgers: LedgerRow[] = [
  {
    id: "lg-1",
    resultPeriod: "TEST02",
    ledgerName: "Test Ledger 02",
    capacityPerNumber: "MMK 800,000",
    settlementRate: "700",
    priorityOrder: 1,
    openTime: "09:00",
    closeTime: "15:00",
    status: "Open",
  },
  {
    id: "lg-2",
    resultPeriod: "JUNE01",
    ledgerName: "Main Ledger",
    capacityPerNumber: "MMK 800,000",
    settlementRate: "700",
    priorityOrder: 1,
    openTime: "09:00",
    closeTime: "15:00",
    status: "Closed",
  },
];

const emptyLedgerForm: LedgerRow = {
  id: "",
  resultPeriod: "TEST02",
  ledgerName: "",
  capacityPerNumber: "MMK 800,000",
  settlementRate: "700",
  priorityOrder: 1,
  openTime: "09:00",
  closeTime: "15:00",
  status: "Open",
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

const capacityRows: CapacityRow[] = [
  { number: "124", used: "MMK 3,000", remaining: "MMK 797,000", status: "Available" },
  { number: "112", used: "MMK 1,000", remaining: "MMK 799,000", status: "Available" },
  { number: "121", used: "MMK 1,000", remaining: "MMK 799,000", status: "Available" },
  { number: "211", used: "MMK 1,000", remaining: "MMK 799,000", status: "Available" },
];

const resultPeriodOptions: DropdownOption[] = [
  { label: "All Result Periods", value: "All Result Periods" },
  { label: "TEST02", value: "TEST02" },
  { label: "JUNE01", value: "JUNE01" },
];

const statusOptions: DropdownOption[] = [
  { label: "All Status", value: "All Status" },
  { label: "Open", value: "Open" },
  { label: "Closed", value: "Closed" },
];

const priorityOptions: DropdownOption[] = [
  { label: "All Priority", value: "All Priority" },
  { label: "Priority 1", value: "Priority 1" },
];

const ledgerStatusOptions: DropdownOption[] = [
  { label: "Open", value: "Open" },
  { label: "Closed", value: "Closed" },
];

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
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
          : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]",
      )}
    >
      {children}
    </button>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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

const drawerInputClassName =
  "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30";

export function LedgersScreen() {
  const [rows, setRows] = useState<LedgerRow[]>(ledgers);
  const [selectedLedger, setSelectedLedger] = useState<LedgerRow | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | null>(null);
  const [activeRange, setActiveRange] = useState("100–199");
  const [searchTerm, setSearchTerm] = useState("");
  const [resultPeriodFilter, setResultPeriodFilter] = useState("All Result Periods");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [capacitySearch, setCapacitySearch] = useState("");
  const [formState, setFormState] = useState<LedgerRow>(emptyLedgerForm);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        `${row.resultPeriod} ${row.ledgerName}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPeriod =
        resultPeriodFilter === "All Result Periods" || row.resultPeriod === resultPeriodFilter;
      const matchesStatus = statusFilter === "All Status" || row.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All Priority" ||
        `${row.priorityOrder}` === priorityFilter.replace("Priority ", "");
      return matchesSearch && matchesPeriod && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, resultPeriodFilter, rows, searchTerm, statusFilter]);

  const visibleCapacityRows = useMemo(() => {
    return capacityRows.filter((row) => {
      return (
        capacitySearch.trim() === "" ||
        row.number.includes(capacitySearch.trim())
      );
    });
  }, [capacitySearch]);

  const columns: TableColumn<LedgerRow>[] = [
    {
      key: "resultPeriod",
      header: "Result Period",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-semibold">{row.resultPeriod}</span>,
    },
    {
      key: "ledgerName",
      header: "Ledger Name",
      className: "min-w-[180px] whitespace-nowrap",
      render: (row) => row.ledgerName,
    },
    {
      key: "capacityPerNumber",
      header: "Capacity Per Number",
      className: "whitespace-nowrap",
      render: (row) => row.capacityPerNumber,
    },
    {
      key: "settlementRate",
      header: "Settlement Rate",
      className: "w-24 whitespace-nowrap text-center",
      render: (row) => row.settlementRate,
    },
    {
      key: "priorityOrder",
      header: "Priority Order",
      className: "w-24 whitespace-nowrap text-center",
      render: (row) => row.priorityOrder,
    },
    {
      key: "openTime",
      header: "Open Time",
      className: "w-24 whitespace-nowrap text-center",
      render: (row) => row.openTime,
    },
    {
      key: "closeTime",
      header: "Close Time",
      className: "w-24 whitespace-nowrap text-center",
      render: (row) => row.closeTime,
    },
    {
      key: "status",
      header: "Status",
      className: "w-28 whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={row.status === "Open" ? "success" : "neutral"}>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[190px] whitespace-nowrap",
      render: (row) => (
        <div className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
          <button
            type="button"
            className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            onClick={() => setSelectedLedger(row)}
          >
            View Capacity
          </button>
          <span className="text-[var(--color-border-strong)]">|</span>
          <button
            type="button"
            className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            onClick={() => {
              setFormState(row);
              setDrawerMode("edit");
            }}
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Ledgers
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Manage ledger configuration and number capacities
            </p>
          </div>
          <ActionButton
            onClick={() => {
              setFormState({
                ...emptyLedgerForm,
                id: `lg-${Date.now()}`,
              });
              setDrawerMode("create");
            }}
          >
            Create Ledger
          </ActionButton>
        </section>

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <FilterField label="Search">
              <SearchInput
                placeholder="Search ledgers"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </FilterField>
            <FilterField label="Result Period">
              <DropdownFilter
                label="Result Period"
                options={resultPeriodOptions}
                selectedValue={resultPeriodFilter}
                onChange={setResultPeriodFilter}
                placeholder="All Result Periods"
              />
            </FilterField>
            <FilterField label="Status">
              <DropdownFilter
                label="Status"
                options={statusOptions}
                selectedValue={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Status"
              />
            </FilterField>
            <FilterField label="Priority">
              <DropdownFilter
                label="Priority"
                options={priorityOptions}
                selectedValue={priorityFilter}
                onChange={setPriorityFilter}
                placeholder="All Priority"
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title="Ledger List"
          description="Current ledger configuration for owner/admin review."
          rows={filteredRows}
          columns={columns}
          tableClassName="min-w-[1160px] table-fixed"
        />
      </div>

      <DetailDrawer
        open={drawerMode !== null}
        title={drawerMode === "create" ? "Create Ledger" : "Edit Ledger"}
        subtitle={drawerMode === "create" ? "Local mock state" : formState.ledgerName}
        onClose={() => {
          setDrawerMode(null);
          setFormState(emptyLedgerForm);
        }}
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>Result Period</FieldLabel>
              <input
                type="text"
                value={formState.resultPeriod}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, resultPeriod: event.target.value }))
                }
                placeholder="Result Period"
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Ledger Name</FieldLabel>
              <input
                type="text"
                value={formState.ledgerName}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, ledgerName: event.target.value }))
                }
                placeholder="Ledger Name"
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel helper="Maximum amount each number can accept.">
                Capacity Per Number
              </FieldLabel>
              <input
                type="text"
                value={formState.capacityPerNumber}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    capacityPerNumber: event.target.value,
                  }))
                }
                placeholder="Capacity Per Number"
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel helper="Multiplier used for winning settlement.">
                Settlement Rate
              </FieldLabel>
              <input
                type="text"
                value={formState.settlementRate}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    settlementRate: event.target.value,
                  }))
                }
                placeholder="Settlement Rate"
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel helper="Lower number means higher priority.">
                Priority Order
              </FieldLabel>
              <input
                type="number"
                value={formState.priorityOrder}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    priorityOrder: Number(event.target.value),
                  }))
                }
                placeholder="Priority Order"
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Status</FieldLabel>
              <DropdownFilter
                label="Status"
                options={ledgerStatusOptions}
                selectedValue={formState.status}
                onChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    status: value as LedgerStatus,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Open Time</FieldLabel>
              <input
                type="time"
                value={formState.openTime}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, openTime: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Close Time</FieldLabel>
              <input
                type="time"
                value={formState.closeTime}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, closeTime: event.target.value }))
                }
                className={drawerInputClassName}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <ActionButton
              variant="secondary"
              onClick={() => {
                setDrawerMode(null);
                setFormState(emptyLedgerForm);
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
                      id: formState.id || `lg-${Date.now()}`,
                    },
                    ...current,
                  ]);
                } else {
                  setRows((current) =>
                    current.map((row) => (row.id === formState.id ? formState : row)),
                  );
                }
                setDrawerMode(null);
                setFormState(emptyLedgerForm);
              }}
            >
              Save
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={selectedLedger !== null}
        title={`${selectedLedger?.ledgerName ?? "Ledger"} Capacity`}
        subtitle={selectedLedger?.resultPeriod}
        onClose={() => setSelectedLedger(null)}
      >
        {selectedLedger ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
              Capacity shows how much has been used for each 3-digit number in this ledger.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  Total Numbers
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                  1000
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  Capacity Per Number
                </p>
                <p className="mt-1 whitespace-nowrap text-lg font-semibold text-[var(--color-foreground)]">
                  MMK 800,000
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  Total Used
                </p>
                <p className="mt-1 whitespace-nowrap text-lg font-semibold text-[var(--color-foreground)]">
                  MMK 6,000
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  Remaining Capacity
                </p>
                <p className="mt-1 whitespace-nowrap text-lg font-semibold text-[var(--color-foreground)]">
                  MMK 799,994,000
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white">
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <input
                  type="search"
                  placeholder="Search number, e.g. 124"
                  value={capacitySearch}
                  onChange={(event) => setCapacitySearch(event.target.value)}
                  className="h-10 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm outline-none transition focus:border-[var(--color-primary)] focus:bg-white focus-visible:ring-2 focus-visible:ring-emerald-700/30"
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
                {visibleCapacityRows.map((row) => (
                  <div
                    key={row.number}
                    className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 md:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_120px]"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                        Number
                      </p>
                      <p className="mt-1 text-base font-semibold text-[var(--color-foreground)]">
                        {row.number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                        Used
                      </p>
                      <p className="mt-1 whitespace-nowrap text-sm font-medium text-[var(--color-foreground)]">
                        {row.used}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                        Remaining
                      </p>
                      <p className="mt-1 whitespace-nowrap text-sm font-medium text-[var(--color-foreground)]">
                        {row.remaining}
                      </p>
                    </div>
                    <div className="flex items-center md:justify-end">
                      <StatusBadge status="success">{row.status}</StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
