"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { DropdownFilter, type DropdownOption } from "@/components/ui/DropdownFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCompanyWallets, type ApiCompanyWallet } from "@/lib/api/company";
import {
  approveSettlement,
  getSettlementBatch,
  getSettlementBatches,
  type ApiSettlementBatch,
} from "@/lib/api/settlements";
import { ensureResults } from "@/lib/api/types";
import { formatMmkAmount } from "@/lib/format";
import type { StatusTone, TableColumn } from "@/lib/types";

const statusOptions: DropdownOption[] = [
  { label: "All Status", value: "all" },
  { label: "Previewed", value: "previewed" },
  { label: "Funding Required", value: "funding_required" },
  { label: "Paid", value: "paid" },
  { label: "Voided", value: "voided" },
];

const dateOptions: DropdownOption[] = [
  { label: "All Dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
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

function statusTone(status: string): StatusTone {
  switch (status) {
    case "previewed":
      return "info";
    case "funding_required":
      return "warning";
    case "paid":
      return "success";
    case "voided":
      return "danger";
    default:
      return "neutral";
  }
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

const cardClassName =
  "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_10px_32px_rgba(15,23,42,0.05)]";

export function SettlementPreviewScreen() {
  const [batches, setBatches] = useState<ApiSettlementBatch[]>([]);
  const [wallets, setWallets] = useState<ApiCompanyWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [resultPeriodFilter, setResultPeriodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<ApiSettlementBatch | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [batchResponse, walletResponse] = await Promise.all([
        getSettlementBatches(),
        getCompanyWallets(),
      ]);
      setBatches(ensureResults(batchResponse));
      setWallets(ensureResults(walletResponse));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load settlement batches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      const timer = window.setTimeout(() => {
        setSelectedBatch(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;

    getSettlementBatch(selectedBatchId)
      .then((batch) => {
        if (active) {
          setSelectedBatch(batch);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load settlement batch.");
        }
      })
      .finally(() => {
        if (active) {
          setDrawerLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedBatchId]);

  const resultPeriodOptions = useMemo<DropdownOption[]>(() => {
    const seen = new Set<string>();
    const periodOptions = batches
      .filter((batch) => {
        const code = batch.result_period_code ?? String(batch.result_period);
        if (seen.has(code)) return false;
        seen.add(code);
        return true;
      })
      .map((batch) => ({
        label: batch.result_period_code ?? String(batch.result_period),
        value: batch.result_period_code ?? String(batch.result_period),
      }));

    return [{ label: "All Periods", value: "all" }, ...periodOptions];
  }, [batches]);

  const reserveAvailable = wallets[0]?.balance ?? "0";

  const filteredBatches = useMemo(() => {
    const now = new Date();
    return batches.filter((batch) => {
      const periodCode = batch.result_period_code ?? String(batch.result_period);
      const matchesSearch =
        searchTerm.trim() === "" ||
        `${batch.id} ${periodCode}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || batch.status === statusFilter;
      const matchesPeriod = resultPeriodFilter === "all" || periodCode === resultPeriodFilter;

      if (!(matchesSearch && matchesStatus && matchesPeriod)) {
        return false;
      }

      if (dateFilter === "all") {
        return true;
      }

      const createdAt = new Date(batch.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        return true;
      }

      if (dateFilter === "today") {
        return createdAt.toDateString() === now.toDateString();
      }

      if (dateFilter === "week") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6);
        return createdAt >= weekStart;
      }

      if (dateFilter === "month") {
        return (
          createdAt.getFullYear() === now.getFullYear() &&
          createdAt.getMonth() === now.getMonth()
        );
      }

      return true;
    });
  }, [batches, dateFilter, resultPeriodFilter, searchTerm, statusFilter]);

  const columns: TableColumn<ApiSettlementBatch>[] = [
    {
      key: "batchId",
      header: "Batch ID",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-semibold">{`SET-${row.result_period_code ?? row.result_period}-${String(row.id).padStart(3, "0")}`}</span>,
    },
    {
      key: "resultPeriod",
      header: "Result Period",
      className: "whitespace-nowrap",
      render: (row) => row.result_period_code ?? row.result_period,
    },
    {
      key: "resultNumber",
      header: "Result Number",
      className: "whitespace-nowrap text-center",
      render: (row) => row.result_number,
    },
    {
      key: "totalCollected",
      header: "Total Collected",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_collected),
    },
    {
      key: "totalSettlement",
      header: "Total Settlement",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_settlement),
    },
    {
      key: "reserveRequired",
      header: "Company Reserve Required",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.company_reserve_required),
    },
    {
      key: "profitLoss",
      header: "Final Profit/Loss",
      className: "whitespace-nowrap",
      render: (row) => (
        <span
          className={
            Number(row.final_profit_loss) >= 0
              ? "font-medium text-[var(--color-success)]"
              : "font-medium text-[var(--color-danger)]"
          }
        >
          {formatMmkAmount(row.final_profit_loss)}
        </span>
      ),
    },
    {
      key: "matchedUsers",
      header: "Matched Users",
      className: "whitespace-nowrap text-center",
      render: (row) => row.items.length,
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[96px] whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => {
            setDrawerLoading(true);
            setSelectedBatchId(row.id);
          }}
        >
          View
        </button>
      ),
    },
  ];

  const matchedColumns: TableColumn<ApiSettlementBatch["items"][number]>[] = [
    {
      key: "user",
      header: "User",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.user_name ?? `User #${row.user}`}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      className: "whitespace-nowrap",
      render: (row) => row.user_phone ?? "—",
    },
    {
      key: "number",
      header: "Number",
      className: "whitespace-nowrap text-center",
      render: (row) => row.number_code,
    },
    {
      key: "matchedAmount",
      header: "Matched Amount",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_matched_amount),
    },
    {
      key: "settlementAmount",
      header: "Settlement Amount",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.settlement_amount),
    },
    {
      key: "walletStatus",
      header: "Wallet Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
  ];

  async function handleApproveSettlement() {
    if (!selectedBatch) return;

    setSubmitting(true);
    try {
      await approveSettlement(selectedBatch.id);
      await loadData();
      const refreshed = await getSettlementBatch(selectedBatch.id);
      setSelectedBatch(refreshed);
      setApproveOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to approve settlement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Settlement Preview
            </h1>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

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
              />
            </FilterField>
            <FilterField label="Result Period">
              <DropdownFilter
                label="Result Period"
                options={resultPeriodOptions}
                selectedValue={resultPeriodFilter}
                onChange={setResultPeriodFilter}
              />
            </FilterField>
            <FilterField label="Date">
              <DropdownFilter
                label="Date"
                options={dateOptions}
                selectedValue={dateFilter}
                onChange={setDateFilter}
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
          emptyState={
            loading ? (
              <EmptyState title="Loading settlement batches" description="Fetching settlement batches from the backend." />
            ) : (
              <EmptyState
                title="No settlement batches found"
                description="Settlement previews will appear here after result entry."
              />
            )
          }
        />
      </div>

      <DetailDrawer
        open={selectedBatchId !== null}
        title={
          selectedBatch
            ? `Settlement Batch SET-${selectedBatch.result_period_code ?? selectedBatch.result_period}-${String(selectedBatch.id).padStart(3, "0")}`
            : "Settlement Batch"
        }
        subtitle={
          selectedBatch
            ? `${selectedBatch.result_period_code ?? selectedBatch.result_period} / Result ${selectedBatch.result_number}`
            : undefined
        }
        onClose={() => {
          setSelectedBatchId(null);
          setSelectedBatch(null);
          setApproveOpen(false);
        }}
      >
        {drawerLoading ? (
          <div className="text-sm text-[var(--color-muted-foreground)]">Loading settlement batch...</div>
        ) : selectedBatch ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Result Period
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedBatch.result_period_code ?? selectedBatch.result_period}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Result Number
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedBatch.result_number}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Total Collected
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(selectedBatch.total_collected)}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Total Settlement
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(selectedBatch.total_settlement)}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Company Reserve Available
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(reserveAvailable)}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Company Reserve Required
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(selectedBatch.company_reserve_required)}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Final Profit/Loss
                </p>
                <p
                  className={`mt-1 whitespace-nowrap text-sm font-semibold ${
                    Number(selectedBatch.final_profit_loss) >= 0
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-danger)]"
                  }`}
                >
                  {formatMmkAmount(selectedBatch.final_profit_loss)}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={statusTone(selectedBatch.status)}>
                    {statusLabel(selectedBatch.status)}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <DataTable
              title="Matched Users"
              rows={selectedBatch.items}
              columns={matchedColumns}
              tableClassName="min-w-[820px]"
              emptyState={
                <EmptyState
                  title="No matched users"
                  description="This settlement batch has no matched users."
                />
              }
            />

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm leading-6 text-amber-950">
                Approving settlement will credit matched user wallets and deduct company reserve if required. This action cannot be easily undone.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => setApproveOpen(true)}
                  disabled={selectedBatch.status === "paid" || selectedBatch.status === "voided" || submitting}
                >
                  Approve Settlement
                </ActionButton>
                <ActionButton variant="secondary" disabled>
                  Void Settlement Unavailable
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
                {`SET-${selectedBatch.result_period_code ?? selectedBatch.result_period}-${String(selectedBatch.id).padStart(3, "0")}`}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Total Settlement
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                {formatMmkAmount(selectedBatch.total_settlement)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Company Reserve Required
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                {formatMmkAmount(selectedBatch.company_reserve_required)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Matched Users
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                {selectedBatch.items.length}
              </p>
            </div>
          </div>
        ) : null}
      </ConfirmModal>
    </>
  );
}
