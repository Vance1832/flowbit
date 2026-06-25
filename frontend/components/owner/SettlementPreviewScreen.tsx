"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { DropdownFilter, type DropdownOption } from "@/components/ui/DropdownFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/components/providers/AuthProvider";
import { downloadFromApi } from "@/lib/api/client";
import { getCompanyWallets, type ApiCompanyWallet } from "@/lib/api/company";
import {
  approveSettlement,
  getSettlementBatch,
  getSettlementBatches,
  voidSettlement,
  type ApiSettlementBatch,
} from "@/lib/api/settlements";
import { ensureResults } from "@/lib/api/types";
import { formatMmkAmount } from "@/lib/format";
import type { StatusTone, TableColumn } from "@/lib/types";

// status key → message key; the badge label maps through this.
const STATUS_KEY: Record<string, string> = {
  previewed: "settlementPreview.statusPreviewed",
  funding_required: "settlementPreview.statusFundingRequired",
  paid: "settlementPreview.statusPaid",
  voided: "settlementPreview.statusVoided",
};

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

const cardClassName =
  "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_10px_32px_rgba(15,23,42,0.05)]";

export function SettlementPreviewScreen() {
  const t = useTranslations();

  const statusLabel = (status: string) =>
    STATUS_KEY[status]
      ? t(STATUS_KEY[status])
      : status
          .split("_")
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(" ");

  const batchIdFull = (batch: ApiSettlementBatch) =>
    t("settlementPreview.batchIdFull", {
      period: batch.result_period_code ?? batch.result_period,
      seq: String(batch.id).padStart(3, "0"),
    });

  const statusOptions: DropdownOption[] = [
    { label: t("settlementPreview.allStatus"), value: "all" },
    { label: t("settlementPreview.statusPreviewed"), value: "previewed" },
    { label: t("settlementPreview.statusFundingRequired"), value: "funding_required" },
    { label: t("settlementPreview.statusPaid"), value: "paid" },
    { label: t("settlementPreview.statusVoided"), value: "voided" },
  ];
  const dateOptions: DropdownOption[] = [
    { label: t("filters.allDates"), value: "all" },
    { label: t("filters.today"), value: "today" },
    { label: t("filters.thisWeek"), value: "week" },
    { label: t("filters.thisMonth"), value: "month" },
  ];

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
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFromApi(
        "/api/settlements/admin/batches/export/",
        "flowbit-settlements.csv",
      );
    } catch {
      setError(t("settlementPreview.exportError"));
    } finally {
      setExporting(false);
    }
  }

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
      setError(loadError instanceof Error ? loadError.message : t("settlementPreview.loadError"));
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
          setError(loadError instanceof Error ? loadError.message : t("settlementPreview.loadBatchError"));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    return [{ label: t("settlementPreview.allPeriods"), value: "all" }, ...periodOptions];
  }, [batches, t]);

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
      header: t("settlementPreview.batchId"),
      className: "whitespace-nowrap",
      render: (row) => <span className="font-semibold">{batchIdFull(row)}</span>,
    },
    {
      key: "resultPeriod",
      header: t("settlementPreview.resultPeriod"),
      className: "whitespace-nowrap",
      render: (row) => row.result_period_code ?? row.result_period,
    },
    {
      key: "resultNumber",
      header: t("settlementPreview.resultNumber"),
      className: "whitespace-nowrap text-center",
      render: (row) => row.result_number,
    },
    {
      key: "totalCollected",
      header: t("settlementPreview.totalCollected"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_collected),
    },
    {
      key: "totalSettlement",
      header: t("settlementPreview.totalSettlement"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_settlement),
    },
    {
      key: "reserveRequired",
      header: t("settlementPreview.reserveRequired"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.company_reserve_required),
    },
    {
      key: "profitLoss",
      header: t("settlementPreview.profitLoss"),
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
      header: t("settlementPreview.matchedUsers"),
      className: "whitespace-nowrap text-center",
      render: (row) => row.items.length,
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: t("settlementPreview.colActions"),
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
          {t("settlementPreview.view")}
        </button>
      ),
    },
  ];

  const matchedColumns: TableColumn<ApiSettlementBatch["items"][number]>[] = [
    {
      key: "user",
      header: t("settlementPreview.mUser"),
      className: "whitespace-nowrap",
      render: (row) => (
        <span className="font-medium">
          {row.user_name ?? t("settlementPreview.userFallback", { id: row.user })}
        </span>
      ),
    },
    {
      key: "phone",
      header: t("settlementPreview.mPhone"),
      className: "whitespace-nowrap",
      render: (row) => row.user_phone ?? "—",
    },
    {
      key: "number",
      header: t("settlementPreview.mNumber"),
      className: "whitespace-nowrap text-center",
      render: (row) => row.number_code,
    },
    {
      key: "matchedAmount",
      header: t("settlementPreview.mMatchedAmount"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_matched_amount),
    },
    {
      key: "settlementAmount",
      header: t("settlementPreview.mSettlementAmount"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.settlement_amount),
    },
    {
      key: "walletStatus",
      header: t("settlementPreview.mWalletStatus"),
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
      setError(submitError instanceof Error ? submitError.message : t("settlementPreview.approveError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVoidSettlement() {
    if (!selectedBatch) return;

    setSubmitting(true);
    try {
      await voidSettlement(selectedBatch.id, voidReason.trim());
      await loadData();
      const refreshed = await getSettlementBatch(selectedBatch.id);
      setSelectedBatch(refreshed);
      setVoidOpen(false);
      setVoidReason("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("settlementPreview.voidError"));
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
              {t("settlementPreview.title")}
            </h1>
          </div>
          <ActionButton variant="secondary" disabled={exporting} onClick={handleExport}>
            {exporting ? t("settlementPreview.exporting") : t("settlementPreview.exportCsv")}
          </ActionButton>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <FilterField label={t("settlementPreview.filterSearch")}>
              <SearchInput
                placeholder={t("settlementPreview.searchPlaceholder")}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
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
            <FilterField label={t("settlementPreview.resultPeriod")}>
              <DropdownFilter
                label={t("settlementPreview.resultPeriod")}
                options={resultPeriodOptions}
                selectedValue={resultPeriodFilter}
                onChange={setResultPeriodFilter}
              />
            </FilterField>
            <FilterField label={t("settlementPreview.date")}>
              <DropdownFilter
                label={t("settlementPreview.date")}
                options={dateOptions}
                selectedValue={dateFilter}
                onChange={setDateFilter}
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title={t("settlementPreview.tableTitle")}
          description={t("settlementPreview.tableDesc")}
          rows={filteredBatches}
          columns={columns}
          tableClassName="min-w-[1380px]"
          emptyState={
            loading ? (
              <EmptyState title={t("settlementPreview.loadingTitle")} description={t("settlementPreview.loadingDesc")} />
            ) : (
              <EmptyState
                title={t("settlementPreview.emptyTitle")}
                description={t("settlementPreview.emptyDesc")}
              />
            )
          }
        />
      </div>

      <DetailDrawer
        open={selectedBatchId !== null}
        title={
          selectedBatch
            ? t("settlementPreview.drawerTitle", { id: batchIdFull(selectedBatch) })
            : t("settlementPreview.drawerTitleFallback")
        }
        subtitle={
          selectedBatch
            ? t("settlementPreview.drawerSubtitle", {
                period: selectedBatch.result_period_code ?? selectedBatch.result_period,
                number: selectedBatch.result_number,
              })
            : undefined
        }
        onClose={() => {
          setSelectedBatchId(null);
          setSelectedBatch(null);
          setApproveOpen(false);
        }}
      >
        {drawerLoading ? (
          <div className="text-sm text-[var(--color-muted-foreground)]">{t("settlementPreview.loadingBatch")}</div>
        ) : selectedBatch ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  {t("settlementPreview.resultPeriod")}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedBatch.result_period_code ?? selectedBatch.result_period}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  {t("settlementPreview.resultNumber")}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedBatch.result_number}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  {t("settlementPreview.totalCollected")}
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(selectedBatch.total_collected)}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  {t("settlementPreview.totalSettlement")}
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(selectedBatch.total_settlement)}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  {t("settlementPreview.reserveAvailable")}
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(reserveAvailable)}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  {t("settlementPreview.reserveRequired")}
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                  {formatMmkAmount(selectedBatch.company_reserve_required)}
                </p>
              </div>
              <div className={`${cardClassName} px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  {t("settlementPreview.profitLoss")}
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
                  {t("common.status")}
                </p>
                <div className="mt-1">
                  <StatusBadge status={statusTone(selectedBatch.status)}>
                    {statusLabel(selectedBatch.status)}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <DataTable
              title={t("settlementPreview.matchedUsers")}
              rows={selectedBatch.items}
              columns={matchedColumns}
              tableClassName="min-w-[820px]"
              emptyState={
                <EmptyState
                  title={t("settlementPreview.noMatchedUsers")}
                  description={t("settlementPreview.noMatchedUsersDesc")}
                />
              }
            />

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm leading-6 text-amber-950">
                {t("settlementPreview.approveWarning")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => setApproveOpen(true)}
                  disabled={selectedBatch.status === "paid" || selectedBatch.status === "voided" || submitting}
                >
                  {t("settlementPreview.approveSettlement")}
                </ActionButton>
                {isOwner ? (
                  <ActionButton
                    variant="danger"
                    onClick={() => setVoidOpen(true)}
                    disabled={selectedBatch.status === "voided" || submitting}
                  >
                    {t("settlementPreview.voidSettlement")}
                  </ActionButton>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmModal
        open={approveOpen && selectedBatch !== null}
        title={t("settlementPreview.approveTitle")}
        description={t("settlementPreview.approveDesc")}
        confirmLabel={t("settlementPreview.approveSettlement")}
        cancelLabel={t("settlementPreview.cancel")}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApproveSettlement}
      >
        {selectedBatch ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                {t("settlementPreview.batchId")}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                {batchIdFull(selectedBatch)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                {t("settlementPreview.totalSettlement")}
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                {formatMmkAmount(selectedBatch.total_settlement)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                {t("settlementPreview.reserveRequired")}
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                {formatMmkAmount(selectedBatch.company_reserve_required)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                {t("settlementPreview.matchedUsers")}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                {selectedBatch.items.length}
              </p>
            </div>
          </div>
        ) : null}
      </ConfirmModal>

      <ConfirmModal
        open={voidOpen && selectedBatch !== null}
        title={t("settlementPreview.voidTitle")}
        description={t("settlementPreview.voidDesc")}
        confirmLabel={submitting ? t("settlementPreview.voiding") : t("settlementPreview.voidSettlement")}
        tone="danger"
        confirmDisabled={voidReason.trim() === "" || submitting}
        onClose={() => {
          setVoidOpen(false);
          setVoidReason("");
        }}
        onConfirm={handleVoidSettlement}
      >
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
            {t("settlementPreview.reasonLabel")}
          </span>
          <textarea
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            rows={3}
            placeholder={t("settlementPreview.reasonPlaceholder")}
            className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          />
        </label>
      </ConfirmModal>
    </>
  );
}
