"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { downloadFromApi } from "@/lib/api/client";
import {
  addCompanyReserve,
  approveCompanyCashout,
  createCompanyCashout,
  getCompanyCashouts,
  getCompanyTransactions,
  getCompanyWallets,
  markCompanyCashoutPaid,
  type ApiCompanyCashoutRequest,
  type ApiCompanyWallet,
  type ApiCompanyWalletTransaction,
} from "@/lib/api/company";
import { ensureResults } from "@/lib/api/types";
import { formatDateTime, formatMmkAmount } from "@/lib/format";
import type { StatusTone, TableColumn } from "@/lib/types";

function typeTone(type: string): StatusTone {
  switch (type) {
    case "reserve_deposit":
      return "success";
    case "settlement_funding":
      return "warning";
    case "company_cashout":
    case "profit_transfer":
      return "neutral";
    default:
      return "neutral";
  }
}

// transaction type → message key.
const TYPE_KEY: Record<string, string> = {
  reserve_deposit: "companyReserve.typeReserveDeposit",
  settlement_funding: "companyReserve.typeSettlementFunding",
  company_cashout: "companyReserve.typeCashout",
  profit_transfer: "companyReserve.typeProfitTransfer",
};

// cashout status → message key.
const STATUS_KEY: Record<string, string> = {
  pending: "companyReserve.statusPending",
  approved: "companyReserve.statusApproved",
  paid: "companyReserve.statusPaid",
  rejected: "companyReserve.statusRejected",
};

function cashoutTone(status: string): StatusTone {
  switch (status) {
    case "pending":
      return "warning";
    case "approved":
      return "info";
    case "paid":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "neutral";
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--color-foreground)]">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClassName =
  "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30";

export function CompanyReserveScreen() {
  const t = useTranslations();
  const searchParams = useSearchParams();

  const transactionLabel = (type: string) =>
    TYPE_KEY[type]
      ? t(TYPE_KEY[type])
      : type
          .split("_")
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(" ");

  const statusLabel = (status: string) =>
    STATUS_KEY[status]
      ? t(STATUS_KEY[status])
      : status
          .split("_")
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(" ");

  const [wallets, setWallets] = useState<ApiCompanyWallet[]>([]);
  const [transactions, setTransactions] = useState<ApiCompanyWalletTransaction[]>([]);
  const [cashouts, setCashouts] = useState<ApiCompanyCashoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFromApi(
        "/api/company/admin/transactions/export/",
        "flowbit-company-reserve.csv",
      );
    } catch {
      setError(t("companyReserve.exportError"));
    } finally {
      setExporting(false);
    }
  }
  const [depositDrawerOpen, setDepositDrawerOpen] = useState(false);
  const [cashoutDrawerOpen, setCashoutDrawerOpen] = useState(false);
  const [selectedCashoutId, setSelectedCashoutId] = useState<number | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDescription, setDepositDescription] = useState("");
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [cashoutReason, setCashoutReason] = useState("");
  const [cashoutNote, setCashoutNote] = useState("");

  const mainWallet = wallets[0] ?? null;
  const selectedCashout = cashouts.find((cashout) => cashout.id === selectedCashoutId) ?? null;

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [walletResponse, transactionResponse, cashoutResponse] = await Promise.all([
        getCompanyWallets(),
        getCompanyTransactions(),
        getCompanyCashouts(),
      ]);
      setWallets(ensureResults(walletResponse));
      setTransactions(ensureResults(transactionResponse));
      setCashouts(ensureResults(cashoutResponse));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("companyReserve.loadError"));
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
    if (searchParams.get("action") === "add-reserve") {
      const timer = window.setTimeout(() => {
        setDepositDrawerOpen(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [searchParams]);

  const pendingCashouts = cashouts.filter((cashout) => cashout.status === "pending");
  const pendingCashoutAmount = pendingCashouts.reduce((sum, cashout) => sum + Number(cashout.amount), 0);
  const totalReserveDeposits = transactions
    .filter((tx) => tx.transaction_type === "reserve_deposit")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalSettlementFunding = transactions
    .filter((tx) => tx.transaction_type === "settlement_funding")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
  const latestSettlementFunding = transactions.find((tx) => tx.transaction_type === "settlement_funding");

  const summaryCards = useMemo(
    () => [
      {
        title: t("companyReserve.cardBalance"),
        value: formatMmkAmount(mainWallet?.balance ?? 0),
        delta: t("companyReserve.cardBalanceDelta"),
        tone: "positive" as const,
        detail: t("companyReserve.cardBalanceDetail"),
      },
      {
        title: t("companyReserve.cardDeposits"),
        value: formatMmkAmount(totalReserveDeposits),
        delta: t("companyReserve.cardDepositsDelta"),
        tone: "positive" as const,
        detail: t("companyReserve.cardDepositsDetail"),
      },
      {
        title: t("companyReserve.cardFunding"),
        value: formatMmkAmount(totalSettlementFunding),
        delta: latestSettlementFunding?.reference_id ? t("companyReserve.cardFundingLatest") : "—",
        tone: "warning" as const,
        detail: latestSettlementFunding?.description ?? t("companyReserve.cardFundingNone"),
      },
      {
        title: t("companyReserve.cardPending"),
        value: formatMmkAmount(pendingCashoutAmount),
        delta: t("companyReserve.cardPendingRequests", {
          count: pendingCashouts.length,
          plural: pendingCashouts.length === 1 ? "" : "s",
        }),
        tone: "neutral" as const,
        detail: t("companyReserve.cardPendingDetail"),
      },
    ],
    [latestSettlementFunding, mainWallet?.balance, pendingCashoutAmount, pendingCashouts.length, totalReserveDeposits, totalSettlementFunding, t],
  );

  const transactionColumns: TableColumn<ApiCompanyWalletTransaction>[] = [
    {
      key: "type",
      header: t("common.type"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={typeTone(row.transaction_type)}>
          {transactionLabel(row.transaction_type)}
        </StatusBadge>
      ),
    },
    {
      key: "amount",
      header: t("common.amount"),
      className: "whitespace-nowrap",
      render: (row) => (
        <span
          className={
            Number(row.amount) >= 0
              ? "font-medium text-[var(--color-success)]"
              : "font-medium text-[var(--color-danger)]"
          }
        >
          {formatMmkAmount(row.amount)}
        </span>
      ),
    },
    {
      key: "balanceBefore",
      header: t("companyReserve.colBalanceBefore"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.balance_before),
    },
    {
      key: "balanceAfter",
      header: t("companyReserve.colBalanceAfter"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.balance_after),
    },
    {
      key: "description",
      header: t("companyReserve.colDescription"),
      render: (row) => row.description ?? "—",
    },
    {
      key: "createdBy",
      header: t("companyReserve.colCreatedBy"),
      className: "whitespace-nowrap",
      render: (row) => row.created_by_name ?? t("companyReserve.userFallback", { id: row.created_by }),
    },
    {
      key: "createdAt",
      header: t("companyReserve.colCreatedAt"),
      className: "whitespace-nowrap",
      render: (row) => formatDateTime(row.created_at),
    },
  ];

  const cashoutColumns: TableColumn<ApiCompanyCashoutRequest>[] = [
    {
      key: "amount",
      header: t("common.amount"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.amount),
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={cashoutTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
    {
      key: "requestedBy",
      header: t("companyReserve.colRequestedBy"),
      className: "whitespace-nowrap",
      render: (row) => row.requested_by_name ?? t("companyReserve.userFallback", { id: row.requested_by }),
    },
    {
      key: "requestedAt",
      header: t("companyReserve.colRequestedAt"),
      className: "whitespace-nowrap",
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "reason",
      header: t("companyReserve.colReason"),
      render: (row) => row.reason ?? "—",
    },
    {
      key: "actions",
      header: t("companyReserve.colActions"),
      className: "w-[88px] whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => setSelectedCashoutId(row.id)}
        >
          {t("common.view")}
        </button>
      ),
    },
  ];

  function resetDepositForm() {
    setDepositAmount("");
    setDepositDescription("");
  }

  function resetCashoutForm() {
    setCashoutAmount("");
    setCashoutReason("");
    setCashoutNote("");
  }

  async function handleAddReserve() {
    if (!mainWallet) return;
    const amount = Number(depositAmount);
    if (!amount) {
      setError(t("companyReserve.amountRequired"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await addCompanyReserve(mainWallet.id, {
        amount,
        description: depositDescription || undefined,
      });
      setMessage(t("companyReserve.depositSuccess"));
      setDepositDrawerOpen(false);
      resetDepositForm();
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("companyReserve.addReserveError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCashoutRequest() {
    const amount = Number(cashoutAmount);
    if (!amount) {
      setError(t("companyReserve.cashoutAmountRequired"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await createCompanyCashout({
        amount,
        reason: cashoutReason || undefined,
        admin_note: cashoutNote || undefined,
      });
      setMessage(t("companyReserve.cashoutSuccess"));
      setCashoutDrawerOpen(false);
      resetCashoutForm();
      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("companyReserve.createCashoutError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproveCashout() {
    if (!selectedCashout) return;
    setSubmitting(true);
    try {
      await approveCompanyCashout(selectedCashout.id, selectedCashout.admin_note ?? undefined);
      setApproveOpen(false);
      await loadData();
      const refreshed = ensureResults(await getCompanyCashouts()).find((item) => item.id === selectedCashout.id) ?? null;
      setSelectedCashoutId(refreshed?.id ?? null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("companyReserve.approveError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkPaid() {
    if (!selectedCashout) return;
    setSubmitting(true);
    try {
      await markCompanyCashoutPaid(selectedCashout.id, selectedCashout.admin_note ?? undefined);
      setPaidOpen(false);
      await loadData();
      const refreshed = ensureResults(await getCompanyCashouts()).find((item) => item.id === selectedCashout.id) ?? null;
      setSelectedCashoutId(refreshed?.id ?? null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("companyReserve.markPaidError"));
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
              {t("companyReserve.title")}
            </h1>
          </div>
          <ActionButton variant="secondary" disabled={exporting} onClick={handleExport}>
            {exporting ? t("companyReserve.exporting") : t("companyReserve.exportCsv")}
          </ActionButton>
        </section>

        {message ? (
          <div className="rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            {message}
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

        <section className="flex flex-wrap gap-3">
          <ActionButton onClick={() => setDepositDrawerOpen(true)}>{t("companyReserve.addReserveDeposit")}</ActionButton>
          <ActionButton variant="secondary" onClick={() => setCashoutDrawerOpen(true)}>
            {t("companyReserve.createCashoutRequest")}
          </ActionButton>
        </section>

        <DataTable
          title={t("companyReserve.txTableTitle")}
          rows={transactions}
          columns={transactionColumns}
          tableClassName="min-w-[1080px]"
          emptyState={
            loading ? (
              <EmptyState title={t("companyReserve.txLoadingTitle")} description={t("companyReserve.txLoadingDesc")} />
            ) : (
              <EmptyState title={t("companyReserve.txEmptyTitle")} description={t("companyReserve.txEmptyDesc")} />
            )
          }
        />

        <DataTable
          title={t("companyReserve.cashoutTableTitle")}
          rows={cashouts}
          columns={cashoutColumns}
          tableClassName="min-w-[1040px]"
          emptyState={
            loading ? (
              <EmptyState title={t("companyReserve.cashoutLoadingTitle")} description={t("companyReserve.cashoutLoadingDesc")} />
            ) : (
              <EmptyState title={t("companyReserve.cashoutEmptyTitle")} description={t("companyReserve.cashoutEmptyDesc")} />
            )
          }
        />
      </div>

      <DetailDrawer
        open={depositDrawerOpen}
        title={t("companyReserve.addReserveDeposit")}
        subtitle={t("companyReserve.depositSubtitle")}
        onClose={() => {
          setDepositDrawerOpen(false);
          resetDepositForm();
        }}
      >
        <div className="space-y-5">
          <Field label={t("companyReserve.fieldAmount")}>
            <input
              type="text"
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value.replace(/[^\d.]/g, ""))}
              className={inputClassName}
            />
          </Field>
          <Field label={t("companyReserve.fieldDescription")}>
            <textarea
              value={depositDescription}
              onChange={(event) => setDepositDescription(event.target.value)}
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            />
          </Field>
          <div className="flex justify-end gap-3">
            <ActionButton variant="secondary" onClick={() => setDepositDrawerOpen(false)}>
              {t("companyReserve.cancel")}
            </ActionButton>
            <ActionButton onClick={handleAddReserve} disabled={submitting || !mainWallet}>
              {submitting ? t("companyReserve.adding") : t("companyReserve.addReserve")}
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={cashoutDrawerOpen}
        title={t("companyReserve.createCashoutRequest")}
        subtitle={t("companyReserve.cashoutSubtitle")}
        onClose={() => {
          setCashoutDrawerOpen(false);
          resetCashoutForm();
        }}
      >
        <div className="space-y-5">
          <Field label={t("companyReserve.fieldAmount")}>
            <input
              type="text"
              value={cashoutAmount}
              onChange={(event) => setCashoutAmount(event.target.value.replace(/[^\d.]/g, ""))}
              className={inputClassName}
            />
          </Field>
          <Field label={t("companyReserve.fieldReason")}>
            <textarea
              value={cashoutReason}
              onChange={(event) => setCashoutReason(event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            />
          </Field>
          <Field label={t("companyReserve.fieldAdminNote")}>
            <textarea
              value={cashoutNote}
              onChange={(event) => setCashoutNote(event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            />
          </Field>
          <div className="flex justify-end gap-3">
            <ActionButton variant="secondary" onClick={() => setCashoutDrawerOpen(false)}>
              {t("companyReserve.cancel")}
            </ActionButton>
            <ActionButton onClick={handleCreateCashoutRequest} disabled={submitting}>
              {submitting ? t("companyReserve.creating") : t("companyReserve.createRequest")}
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={selectedCashout !== null}
        title={t("companyReserve.detailTitle")}
        subtitle={selectedCashout ? formatMmkAmount(selectedCashout.amount) : undefined}
        onClose={() => {
          setSelectedCashoutId(null);
          setApproveOpen(false);
          setPaidOpen(false);
        }}
      >
        {selectedCashout ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [t("companyReserve.fieldAmount"), formatMmkAmount(selectedCashout.amount)],
                [t("common.status"), statusLabel(selectedCashout.status)],
                [t("companyReserve.colRequestedBy"), selectedCashout.requested_by_name ?? t("companyReserve.userFallback", { id: selectedCashout.requested_by })],
                [t("companyReserve.colRequestedAt"), formatDateTime(selectedCashout.created_at)],
                [t("companyReserve.dApprovedBy"), selectedCashout.approved_by_name ?? "—"],
                [t("companyReserve.dApprovedAt"), formatDateTime(selectedCashout.approved_at)],
                [t("companyReserve.dPaidAt"), formatDateTime(selectedCashout.paid_at)],
                [t("companyReserve.fieldReason"), selectedCashout.reason ?? "—"],
                [t("companyReserve.fieldAdminNote"), selectedCashout.admin_note ?? "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm leading-6 text-amber-950">
                {t("companyReserve.cashoutWarning")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => setApproveOpen(true)}
                  disabled={selectedCashout.status !== "pending" || submitting}
                >
                  {t("companyReserve.approveCashout")}
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={() => setPaidOpen(true)}
                  disabled={selectedCashout.status !== "approved" || submitting}
                >
                  {t("companyReserve.markPaid")}
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmModal
        open={approveOpen && selectedCashout !== null}
        title={t("companyReserve.approveTitle")}
        description={t("companyReserve.approveDesc")}
        confirmLabel={t("companyReserve.approveCashout")}
        cancelLabel={t("companyReserve.cancel")}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApproveCashout}
      />

      <ConfirmModal
        open={paidOpen && selectedCashout !== null}
        title={t("companyReserve.paidTitle")}
        description={t("companyReserve.paidDesc")}
        confirmLabel={t("companyReserve.markPaid")}
        cancelLabel={t("companyReserve.cancel")}
        onClose={() => setPaidOpen(false)}
        onConfirm={handleMarkPaid}
      />
    </>
  );
}
