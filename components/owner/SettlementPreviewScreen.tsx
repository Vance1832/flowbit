"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import {
  DropdownFilter,
  type DropdownOption,
} from "@/components/ui/DropdownFilter";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusTone, TableColumn } from "@/lib/types";

type SettlementStatus = "Previewed" | "Funding Required" | "Paid" | "Voided";
type WalletStatus = "Waiting Approval" | "Credited";

type MatchedUser = {
  id: string;
  user: string;
  phone: string;
  number: string;
  matchedAmount: string;
  settlementAmount: string;
  walletStatus: WalletStatus;
};

type SettlementBatch = {
  id: string;
  batchId: string;
  resultPeriod: string;
  resultNumber: string;
  totalCollected: string;
  totalSettlement: string;
  reserveRequired: string;
  profitLoss: string;
  matchedUsers: MatchedUser[];
  reserveAvailable: string;
  status: SettlementStatus;
  createdAt: string;
};

const statusOptions: DropdownOption[] = [
  { label: "All Status", value: "All Status" },
  { label: "Previewed", value: "Previewed" },
  { label: "Funding Required", value: "Funding Required" },
  { label: "Paid", value: "Paid" },
  { label: "Voided", value: "Voided" },
];

const resultPeriodOptions: DropdownOption[] = [
  { label: "All Periods", value: "All Periods" },
  { label: "TEST02", value: "TEST02" },
  { label: "JUNE01", value: "JUNE01" },
];

const dateOptions: DropdownOption[] = [
  { label: "All Dates", value: "All Dates" },
  { label: "Today", value: "Today" },
  { label: "This Week", value: "This Week" },
  { label: "This Month", value: "This Month" },
];

const initialBatches: SettlementBatch[] = [
  {
    id: "st-1",
    batchId: "SET-TEST02-001",
    resultPeriod: "TEST02",
    resultNumber: "124",
    totalCollected: "MMK 6,000",
    totalSettlement: "MMK 2,100,000",
    reserveRequired: "MMK 2,094,000",
    profitLoss: "-MMK 2,094,000",
    reserveAvailable: "MMK 3,000,000",
    status: "Funding Required",
    createdAt: "2026-05-20",
    matchedUsers: [
      {
        id: "mu-1",
        user: "Flow Test User",
        phone: "+959777777777",
        number: "124",
        matchedAmount: "MMK 3,000",
        settlementAmount: "MMK 2,100,000",
        walletStatus: "Waiting Approval",
      },
    ],
  },
  {
    id: "st-2",
    batchId: "SET-JUNE01-001",
    resultPeriod: "JUNE01",
    resultNumber: "387",
    totalCollected: "MMK 1,200,000",
    totalSettlement: "MMK 700,000",
    reserveRequired: "MMK 0",
    profitLoss: "+MMK 500,000",
    reserveAvailable: "MMK 3,000,000",
    status: "Paid",
    createdAt: "2026-05-18",
    matchedUsers: [
      {
        id: "mu-2",
        user: "June Winner 01",
        phone: "+959111111111",
        number: "387",
        matchedAmount: "MMK 500,000",
        settlementAmount: "MMK 350,000",
        walletStatus: "Credited",
      },
      {
        id: "mu-3",
        user: "June Winner 02",
        phone: "+959222222222",
        number: "387",
        matchedAmount: "MMK 500,000",
        settlementAmount: "MMK 350,000",
        walletStatus: "Credited",
      },
    ],
  },
];

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

function statusTone(status: SettlementStatus): StatusTone {
  switch (status) {
    case "Previewed":
      return "info";
    case "Funding Required":
      return "warning";
    case "Paid":
      return "success";
    case "Voided":
      return "danger";
  }
}

function walletTone(status: WalletStatus): StatusTone {
  return status === "Credited" ? "success" : "warning";
}

const cardClassName =
  "rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_10px_32px_rgba(15,23,42,0.05)]";

export function SettlementPreviewScreen() {
  const [batches, setBatches] = useState<SettlementBatch[]>(initialBatches);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [resultPeriodFilter, setResultPeriodFilter] = useState("All Periods");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const selectedBatch =
    batches.find((batch) => batch.id === selectedBatchId) ?? null;

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        `${batch.batchId} ${batch.resultPeriod}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All Status" || batch.status === statusFilter;
      const matchesPeriod =
        resultPeriodFilter === "All Periods" ||
        batch.resultPeriod === resultPeriodFilter;
      const matchesDate =
        dateFilter === "All Dates" ||
        (dateFilter === "Today" && batch.createdAt === "2026-05-20") ||
        (dateFilter === "This Week" &&
          batch.createdAt >= "2026-05-18" &&
          batch.createdAt <= "2026-05-24") ||
        (dateFilter === "This Month" && batch.createdAt.startsWith("2026-05"));

      return matchesSearch && matchesStatus && matchesPeriod && matchesDate;
    });
  }, [batches, dateFilter, resultPeriodFilter, searchTerm, statusFilter]);

  const columns: TableColumn<SettlementBatch>[] = [
    {
      key: "batchId",
      header: "Batch ID",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-semibold">{row.batchId}</span>,
    },
    {
      key: "resultPeriod",
      header: "Result Period",
      className: "whitespace-nowrap",
      render: (row) => row.resultPeriod,
    },
    {
      key: "resultNumber",
      header: "Result Number",
      className: "whitespace-nowrap text-center",
      render: (row) => row.resultNumber,
    },
    {
      key: "totalCollected",
      header: "Total Collected",
      className: "whitespace-nowrap",
      render: (row) => row.totalCollected,
    },
    {
      key: "totalSettlement",
      header: "Total Settlement",
      className: "whitespace-nowrap",
      render: (row) => row.totalSettlement,
    },
    {
      key: "reserveRequired",
      header: "Company Reserve Required",
      className: "whitespace-nowrap",
      render: (row) => row.reserveRequired,
    },
    {
      key: "profitLoss",
      header: "Final Profit/Loss",
      className: "whitespace-nowrap",
      render: (row) => (
        <span
          className={
            row.profitLoss.startsWith("+")
              ? "font-medium text-[var(--color-success)]"
              : "font-medium text-[var(--color-danger)]"
          }
        >
          {row.profitLoss}
        </span>
      ),
    },
    {
      key: "matchedUsers",
      header: "Matched Users",
      className: "whitespace-nowrap text-center",
      render: (row) => row.matchedUsers.length,
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{row.status}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[96px] whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => setSelectedBatchId(row.id)}
        >
          View
        </button>
      ),
    },
  ];

  const matchedColumns: TableColumn<MatchedUser>[] = [
    {
      key: "user",
      header: "User",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.user}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      className: "whitespace-nowrap",
      render: (row) => row.phone,
    },
    {
      key: "number",
      header: "Number",
      className: "whitespace-nowrap text-center",
      render: (row) => row.number,
    },
    {
      key: "matchedAmount",
      header: "Matched Amount",
      className: "whitespace-nowrap",
      render: (row) => row.matchedAmount,
    },
    {
      key: "settlementAmount",
      header: "Settlement Amount",
      className: "whitespace-nowrap",
      render: (row) => row.settlementAmount,
    },
    {
      key: "walletStatus",
      header: "Wallet Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={walletTone(row.walletStatus)}>
          {row.walletStatus}
        </StatusBadge>
      ),
    },
  ];

  function handleApproveSettlement() {
    if (!selectedBatch) return;

    setBatches((current) =>
      current.map((batch) =>
        batch.id === selectedBatch.id
          ? {
              ...batch,
              status: "Paid",
              matchedUsers: batch.matchedUsers.map((user) => ({
                ...user,
                walletStatus: "Credited",
              })),
            }
          : batch,
      ),
    );
    setApproveOpen(false);
  }

  function handleVoidSettlement() {
    if (!selectedBatch) return;

    setBatches((current) =>
      current.map((batch) =>
        batch.id === selectedBatch.id
          ? {
              ...batch,
              status: "Voided",
            }
          : batch,
      ),
    );
    setVoidOpen(false);
  }

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Settlement Preview
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Review settlement batches, reserve requirements, and approve payout to matched users.
            </p>
          </div>
        </section>

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <FilterField label="Search">
              <SearchInput
                placeholder="Search by batch ID or result period"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
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
            <FilterField label="Result Period">
              <DropdownFilter
                label="Result Period"
                options={resultPeriodOptions}
                selectedValue={resultPeriodFilter}
                onChange={setResultPeriodFilter}
                placeholder="All Periods"
              />
            </FilterField>
            <FilterField label="Date">
              <DropdownFilter
                label="Date"
                options={dateOptions}
                selectedValue={dateFilter}
                onChange={setDateFilter}
                placeholder="All Dates"
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title="Settlement Batches"
          description="Settlement batches created after result entry and awaiting owner action."
          rows={filteredBatches}
          columns={columns}
          tableClassName="min-w-[1380px]"
        />
      </div>

      <DetailDrawer
        open={selectedBatch !== null}
        title={`Settlement Batch ${selectedBatch?.batchId ?? ""}`}
        subtitle={selectedBatch ? `${selectedBatch.resultPeriod} / Result ${selectedBatch.resultNumber}` : undefined}
        onClose={() => {
          setSelectedBatchId(null);
          setApproveOpen(false);
          setVoidOpen(false);
        }}
      >
        {selectedBatch ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Result Period
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedBatch.resultPeriod}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Result Number
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedBatch.resultNumber}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Total Collected
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedBatch.totalCollected}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Total Settlement
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedBatch.totalSettlement}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Company Reserve Available
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedBatch.reserveAvailable}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Company Reserve Required
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedBatch.reserveRequired}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Final Profit/Loss
                </p>
                <p
                  className={`mt-1 whitespace-nowrap text-sm font-semibold ${
                    selectedBatch.profitLoss.startsWith("+")
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-danger)]"
                  }`}
                >
                  {selectedBatch.profitLoss}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={statusTone(selectedBatch.status)}>
                    {selectedBatch.status}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <DataTable
              title="Matched Users"
              rows={selectedBatch.matchedUsers}
              columns={matchedColumns}
              tableClassName="min-w-[820px]"
            />

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm leading-6 text-amber-950">
                Approving settlement will credit matched user wallets and deduct company reserve if required. This action cannot be easily undone.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => setApproveOpen(true)}
                  disabled={selectedBatch.status === "Paid" || selectedBatch.status === "Voided"}
                >
                  Approve Settlement
                </ActionButton>
                <ActionButton
                  variant="danger"
                  onClick={() => setVoidOpen(true)}
                  disabled={selectedBatch.status === "Paid" || selectedBatch.status === "Voided"}
                >
                  Void Settlement
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmModal
        open={approveOpen && selectedBatch !== null}
        title="Approve Settlement?"
        description="This action will credit matched user wallets and deduct company reserve if required."
        confirmLabel="Approve Settlement"
        cancelLabel="Cancel"
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApproveSettlement}
      >
        {selectedBatch ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Batch ID
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                {selectedBatch.batchId}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Total Settlement
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                {selectedBatch.totalSettlement}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Company Reserve Required
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                {selectedBatch.reserveRequired}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Matched Users
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                {selectedBatch.matchedUsers.length}
              </p>
            </div>
          </div>
        ) : null}
      </ConfirmModal>

      <ConfirmModal
        open={voidOpen && selectedBatch !== null}
        title="Void Settlement?"
        description="This action will mark the settlement batch as void in local preview state."
        confirmLabel="Void Settlement"
        cancelLabel="Cancel"
        tone="danger"
        onClose={() => setVoidOpen(false)}
        onConfirm={handleVoidSettlement}
      />
    </>
  );
}
