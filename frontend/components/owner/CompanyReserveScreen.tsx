"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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

function transactionLabel(type: string) {
  switch (type) {
    case "reserve_deposit":
      return "Reserve Deposit";
    case "settlement_funding":
      return "Settlement Funding";
    case "company_cashout":
      return "Cashout";
    case "profit_transfer":
      return "Profit Transfer";
    default:
      return type
        .split("_")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ");
  }
}

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

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
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
  const searchParams = useSearchParams();
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
      setError("Unable to export reserve transactions.");
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
      setError(loadError instanceof Error ? loadError.message : "Unable to load company reserve data.");
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
        title: "Current Reserve Balance",
        value: formatMmkAmount(mainWallet?.balance ?? 0),
        delta: "Active",
        tone: "positive" as const,
        detail: "Healthy reserve level",
      },
      {
        title: "Total Reserve Deposits",
        value: formatMmkAmount(totalReserveDeposits),
        delta: "Reserve",
        tone: "positive" as const,
        detail: "All reserve deposits recorded",
      },
      {
        title: "Settlement Funding Used",
        value: formatMmkAmount(totalSettlementFunding),
        delta: latestSettlementFunding?.reference_id ? "Latest" : "—",
        tone: "warning" as const,
        detail: latestSettlementFunding?.description ?? "No settlement funding yet",
      },
      {
        title: "Pending Cashouts",
        value: formatMmkAmount(pendingCashoutAmount),
        delta: `${pendingCashouts.length} request${pendingCashouts.length === 1 ? "" : "s"}`,
        tone: "neutral" as const,
        detail: "Awaiting owner approval",
      },
    ],
    [latestSettlementFunding, mainWallet?.balance, pendingCashoutAmount, pendingCashouts.length, totalReserveDeposits, totalSettlementFunding],
  );

  const transactionColumns: TableColumn<ApiCompanyWalletTransaction>[] = [
    {
      key: "type",
      header: "Type",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={typeTone(row.transaction_type)}>
          {transactionLabel(row.transaction_type)}
        </StatusBadge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
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
      header: "Balance Before",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.balance_before),
    },
    {
      key: "balanceAfter",
      header: "Balance After",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.balance_after),
    },
    {
      key: "description",
      header: "Description",
      render: (row) => row.description ?? "—",
    },
    {
      key: "createdBy",
      header: "Created By",
      className: "whitespace-nowrap",
      render: (row) => row.created_by_name ?? `User #${row.created_by}`,
    },
    {
      key: "createdAt",
      header: "Created At",
      className: "whitespace-nowrap",
      render: (row) => formatDateTime(row.created_at),
    },
  ];

  const cashoutColumns: TableColumn<ApiCompanyCashoutRequest>[] = [
    {
      key: "amount",
      header: "Amount",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.amount),
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={cashoutTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
    {
      key: "requestedBy",
      header: "Requested By",
      className: "whitespace-nowrap",
      render: (row) => row.requested_by_name ?? `User #${row.requested_by}`,
    },
    {
      key: "requestedAt",
      header: "Requested At",
      className: "whitespace-nowrap",
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => row.reason ?? "—",
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[88px] whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => setSelectedCashoutId(row.id)}
        >
          View
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
      setError("Reserve amount is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await addCompanyReserve(mainWallet.id, {
        amount,
        description: depositDescription || undefined,
      });
      setMessage("Reserve deposit added successfully.");
      setDepositDrawerOpen(false);
      resetDepositForm();
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add reserve.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCashoutRequest() {
    const amount = Number(cashoutAmount);
    if (!amount) {
      setError("Cashout amount is required.");
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
      setMessage("Company cashout request created successfully.");
      setCashoutDrawerOpen(false);
      resetCashoutForm();
      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to create company cashout request.",
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
      setError(submitError instanceof Error ? submitError.message : "Unable to approve company cashout.");
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
      setError(submitError instanceof Error ? submitError.message : "Unable to mark company cashout as paid.");
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
              Company Reserve
            </h1>
          </div>
          <ActionButton variant="secondary" disabled={exporting} onClick={handleExport}>
            {exporting ? "Exporting…" : "Export CSV"}
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
          <ActionButton onClick={() => setDepositDrawerOpen(true)}>Add Reserve Deposit</ActionButton>
          <ActionButton variant="secondary" onClick={() => setCashoutDrawerOpen(true)}>
            Create Cashout Request
          </ActionButton>
        </section>

        <DataTable
          title="Company Wallet Transaction History"
          rows={transactions}
          columns={transactionColumns}
          tableClassName="min-w-[1080px]"
          emptyState={
            loading ? (
              <EmptyState title="Loading company transactions" description="Fetching company wallet transactions from the backend." />
            ) : (
              <EmptyState title="No company transactions" description="Company wallet transactions will appear here." />
            )
          }
        />

        <DataTable
          title="Company Cashout Requests"
          rows={cashouts}
          columns={cashoutColumns}
          tableClassName="min-w-[1040px]"
          emptyState={
            loading ? (
              <EmptyState title="Loading cashout requests" description="Fetching company cashout requests from the backend." />
            ) : (
              <EmptyState title="No cashout requests" description="Company cashout requests will appear here." />
            )
          }
        />
      </div>

      <DetailDrawer
        open={depositDrawerOpen}
        title="Add Reserve Deposit"
        subtitle="Record a reserve deposit in the company wallet."
        onClose={() => {
          setDepositDrawerOpen(false);
          resetDepositForm();
        }}
      >
        <div className="space-y-5">
          <Field label="Amount">
            <input
              type="text"
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value.replace(/[^\d.]/g, ""))}
              className={inputClassName}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={depositDescription}
              onChange={(event) => setDepositDescription(event.target.value)}
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            />
          </Field>
          <div className="flex justify-end gap-3">
            <ActionButton variant="secondary" onClick={() => setDepositDrawerOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={handleAddReserve} disabled={submitting || !mainWallet}>
              {submitting ? "Adding..." : "Add Reserve"}
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={cashoutDrawerOpen}
        title="Create Cashout Request"
        subtitle="Create a company reserve cashout request."
        onClose={() => {
          setCashoutDrawerOpen(false);
          resetCashoutForm();
        }}
      >
        <div className="space-y-5">
          <Field label="Amount">
            <input
              type="text"
              value={cashoutAmount}
              onChange={(event) => setCashoutAmount(event.target.value.replace(/[^\d.]/g, ""))}
              className={inputClassName}
            />
          </Field>
          <Field label="Reason">
            <textarea
              value={cashoutReason}
              onChange={(event) => setCashoutReason(event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            />
          </Field>
          <Field label="Admin Note">
            <textarea
              value={cashoutNote}
              onChange={(event) => setCashoutNote(event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            />
          </Field>
          <div className="flex justify-end gap-3">
            <ActionButton variant="secondary" onClick={() => setCashoutDrawerOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={handleCreateCashoutRequest} disabled={submitting}>
              {submitting ? "Creating..." : "Create Request"}
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={selectedCashout !== null}
        title="Company Cashout Request"
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
                ["Amount", formatMmkAmount(selectedCashout.amount)],
                ["Status", statusLabel(selectedCashout.status)],
                ["Requested By", selectedCashout.requested_by_name ?? `User #${selectedCashout.requested_by}`],
                ["Requested At", formatDateTime(selectedCashout.created_at)],
                ["Approved By", selectedCashout.approved_by_name ?? "—"],
                ["Approved At", formatDateTime(selectedCashout.approved_at)],
                ["Paid At", formatDateTime(selectedCashout.paid_at)],
                ["Reason", selectedCashout.reason ?? "—"],
                ["Admin Note", selectedCashout.admin_note ?? "—"],
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
                Company cashout reduces reserve balance. Confirm only after reviewing payment details.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => setApproveOpen(true)}
                  disabled={selectedCashout.status !== "pending" || submitting}
                >
                  Approve Cashout
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={() => setPaidOpen(true)}
                  disabled={selectedCashout.status !== "approved" || submitting}
                >
                  Mark as Paid
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmModal
        open={approveOpen && selectedCashout !== null}
        title="Approve Company Cashout?"
        description="This will approve the cashout request for owner payment processing."
        confirmLabel="Approve Cashout"
        cancelLabel="Cancel"
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApproveCashout}
      />

      <ConfirmModal
        open={paidOpen && selectedCashout !== null}
        title="Mark Company Cashout as Paid?"
        description="This will reduce company reserve balance and record a company wallet transaction."
        confirmLabel="Mark as Paid"
        cancelLabel="Cancel"
        onClose={() => setPaidOpen(false)}
        onConfirm={handleMarkPaid}
      />
    </>
  );
}
