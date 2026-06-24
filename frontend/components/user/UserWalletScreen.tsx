"use client";

import { useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { PageHero } from "@/components/ui/PageHero";
import { StatTile } from "@/components/ui/StatTile";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatMmk,
  useUserApp,
  type UserWalletRequest,
  type UserWalletTransaction,
} from "@/components/providers/UserAppProvider";
import {
  UserField,
  userInputClassName,
} from "@/components/user/UserPrimitives";
import type { TableColumn } from "@/lib/types";

type PaymentMethod = "WavePay" | "KPay" | "Bank Transfer";

const paymentMethodOptions = [
  { label: "WavePay", value: "WavePay" },
  { label: "KPay", value: "KPay" },
  { label: "Bank Transfer", value: "Bank Transfer" },
];

const transactionColumns: TableColumn<UserWalletTransaction>[] = [
  {
    key: "type",
    header: "Type",
    className: "min-w-[180px] whitespace-nowrap",
    render: (row) => <span className="font-medium">{row.type}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    className: "whitespace-nowrap",
    render: (row) => (row.amount === null ? "—" : formatMmk(row.amount)),
  },
  {
    key: "balanceAfter",
    header: "Balance After",
    className: "whitespace-nowrap",
    render: (row) => (row.balanceAfter === null ? "—" : formatMmk(row.balanceAfter)),
  },
  {
    key: "description",
    header: "Description",
    className: "min-w-[220px]",
    render: (row) => row.description,
  },
  {
    key: "date",
    header: "Date",
    className: "whitespace-nowrap",
    render: (row) => row.date,
  },
  {
    key: "status",
    header: "Status",
    className: "whitespace-nowrap",
    render: (row) => (
      <StatusBadge
        status={
          row.status === "Completed" || row.status === "Paid"
            ? "success"
            : row.status === "Pending"
              ? "warning"
              : "neutral"
        }
      >
        {row.status}
      </StatusBadge>
    ),
  },
];

const requestColumns: TableColumn<UserWalletRequest>[] = [
  {
    key: "type",
    header: "Type",
    className: "whitespace-nowrap",
    render: (row) => row.type,
  },
  {
    key: "amount",
    header: "Amount",
    className: "whitespace-nowrap",
    render: (row) => formatMmk(row.amount),
  },
  {
    key: "method",
    header: "Method",
    className: "whitespace-nowrap",
    render: (row) => row.method,
  },
  {
    key: "referenceOrAccount",
    header: "Reference / Account",
    className: "min-w-[180px] whitespace-nowrap",
    render: (row) => row.referenceOrAccount,
  },
  {
    key: "status",
    header: "Status",
    className: "whitespace-nowrap",
    render: (row) => (
      <StatusBadge
        status={
          row.status === "Approved" || row.status === "Paid"
            ? "success"
            : row.status === "Pending"
              ? "warning"
              : "danger"
        }
      >
        {row.status}
      </StatusBadge>
    ),
  },
  {
    key: "createdAt",
    header: "Created At",
    className: "whitespace-nowrap",
    render: (row) => row.createdAt,
  },
  {
    key: "action",
    header: "Action",
    className: "whitespace-nowrap",
    render: (row) => (
      <button
        type="button"
        className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
        onClick={() => row}
      >
        View
      </button>
    ),
  },
];

export function UserWalletScreen() {
  const {
    loading,
    error: providerError,
    availableBalance,
    lockedBalance,
    pendingDeposit,
    pendingWithdrawal,
    walletTransactions,
    walletRequests,
    submitDepositRequest,
    submitWithdrawalRequest,
  } = useUserApp();
  const [activeDrawer, setActiveDrawer] = useState<"deposit" | "withdraw" | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<UserWalletRequest | null>(null);
  const [depositForm, setDepositForm] = useState({
    amount: "",
    paymentMethod: "WavePay" as PaymentMethod,
    senderAccountName: "",
    transactionReference: "",
    userNote: "",
    proofImage: null as File | null,
  });
  // Bumped on reset to remount the (uncontrolled) file input so it clears.
  const [proofInputKey, setProofInputKey] = useState(0);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    paymentMethod: "WavePay" as PaymentMethod,
    accountHolderName: "",
    accountNumber: "",
    userNote: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const orderedTransactions = useMemo(() => {
    return [...walletTransactions].sort((left, right) => right.date.localeCompare(left.date));
  }, [walletTransactions]);

  const orderedRequests = useMemo(() => {
    return [...walletRequests].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [walletRequests]);

  const requestsColumns = useMemo<TableColumn<UserWalletRequest>[]>(() => {
    return requestColumns.map((column) =>
      column.key === "action"
        ? {
            ...column,
            render: (row) => (
              <button
                type="button"
                className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                onClick={() => setSelectedRequest(row)}
              >
                View
              </button>
            ),
          }
        : column,
    );
  }, []);

  function closeDrawer() {
    setActiveDrawer(null);
    setError("");
  }

  async function handleDepositSubmit() {
    const numericAmount = Number(depositForm.amount || 0);

    if (!numericAmount) {
      setError("Amount required.");
      return;
    }
    if (numericAmount < 1000) {
      setError("Minimum deposit amount: MMK 1,000.");
      return;
    }
    if (!depositForm.transactionReference.trim()) {
      setError("Transaction reference required.");
      return;
    }
    if (depositForm.proofImage && depositForm.proofImage.size > 5 * 1024 * 1024) {
      setError("Proof image must be 5 MB or smaller.");
      return;
    }

    try {
      await submitDepositRequest({
        amount: numericAmount,
        paymentMethod: depositForm.paymentMethod,
        senderAccountName: depositForm.senderAccountName,
        transactionReference: depositForm.transactionReference,
        userNote: depositForm.userNote,
        proofImage: depositForm.proofImage,
      });
      setMessage("Deposit request submitted successfully.");
      setDepositForm({
        amount: "",
        paymentMethod: "WavePay",
        senderAccountName: "",
        transactionReference: "",
        userNote: "",
        proofImage: null,
      });
      setProofInputKey((key) => key + 1);
      closeDrawer();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit deposit request.");
    }
  }

  async function handleWithdrawalSubmit() {
    const numericAmount = Number(withdrawalForm.amount || 0);

    if (!numericAmount) {
      setError("Amount required.");
      return;
    }
    if (numericAmount < 1000) {
      setError("Minimum withdrawal amount: MMK 1,000.");
      return;
    }
    if (numericAmount > availableBalance) {
      setError("Amount cannot exceed available balance.");
      return;
    }

    try {
      await submitWithdrawalRequest({
        amount: numericAmount,
        paymentMethod: withdrawalForm.paymentMethod,
        accountHolderName: withdrawalForm.accountHolderName,
        accountNumber: withdrawalForm.accountNumber,
        userNote: withdrawalForm.userNote,
      });
      setMessage("Withdrawal request submitted successfully.");
      setWithdrawalForm({
        amount: "",
        paymentMethod: "WavePay",
        accountHolderName: "",
        accountNumber: "",
        userNote: "",
      });
      closeDrawer();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit withdrawal request.");
    }
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero>
          <p className="text-sm font-medium text-white/80">Wallet</p>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
            Available Balance
          </p>
          <p className="mt-1 text-[34px] font-semibold tracking-tight">
            {formatMmk(availableBalance)}
          </p>
        </PageHero>

        {message ? (
          <div className="rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            {message}
          </div>
        ) : null}

        {providerError ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {providerError}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            Loading wallet data...
          </div>
        ) : null}

        <section className="grid grid-cols-3 gap-3">
          <StatTile label="Locked Balance" value={formatMmk(lockedBalance)} />
          <StatTile label="Pending Deposits" value={formatMmk(pendingDeposit)} tone="positive" />
          <StatTile label="Pending Withdrawals" value={formatMmk(pendingWithdrawal)} tone="negative" />
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton className="h-11 rounded-xl px-5" onClick={() => setActiveDrawer("deposit")}>
              Deposit
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-11 rounded-xl px-5"
              onClick={() => setActiveDrawer("withdraw")}
            >
              Withdraw
            </ActionButton>
          </div>
        </section>

        <DataTable
          title="Wallet Transactions"
          description="Latest wallet movements and payment history."
          columns={transactionColumns}
          rows={orderedTransactions}
          tableClassName="min-w-[980px]"
        />

        <DataTable
          title="Deposit / Withdrawal Requests"
          description="Submitted wallet requests and their current status."
          columns={requestsColumns}
          rows={orderedRequests}
          tableClassName="min-w-[980px]"
        />
      </div>

      <DetailDrawer
        open={activeDrawer === "deposit"}
        title="Submit Deposit Request"
        subtitle="Submit a wallet funding request for review."
        onClose={closeDrawer}
      >
        <div className="space-y-5">
          <UserField label="Amount">
            <input
              value={depositForm.amount}
              onChange={(event) =>
                setDepositForm((current) => ({ ...current, amount: event.target.value.replace(/[^\d]/g, "") }))
              }
              className={userInputClassName}
              placeholder="MMK amount"
            />
          </UserField>
          <UserField label="Payment Method">
            <DropdownFilter
              label="Payment Method"
              options={paymentMethodOptions}
              selectedValue={depositForm.paymentMethod}
              onChange={(value) =>
                setDepositForm((current) => ({ ...current, paymentMethod: value as PaymentMethod }))
              }
            />
          </UserField>
          <UserField label="Sender Account Name">
            <input
              value={depositForm.senderAccountName}
              onChange={(event) =>
                setDepositForm((current) => ({ ...current, senderAccountName: event.target.value }))
              }
              className={userInputClassName}
              placeholder="Enter sender account name"
            />
          </UserField>
          <UserField label="Transaction Reference">
            <input
              value={depositForm.transactionReference}
              onChange={(event) =>
                setDepositForm((current) => ({ ...current, transactionReference: event.target.value }))
              }
              className={userInputClassName}
              placeholder="Enter transaction reference"
            />
          </UserField>
          <UserField label="Proof Image">
            <div className="space-y-2">
              <input
                key={proofInputKey}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(event) =>
                  setDepositForm((current) => ({
                    ...current,
                    proofImage: event.target.files?.[0] ?? null,
                  }))
                }
                className="block w-full rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--color-primary-strong)]"
              />
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Attach a payment screenshot (PNG, JPG, GIF or WebP, up to 5 MB). Optional.
              </p>
            </div>
          </UserField>
          <UserField label="User Note">
            <textarea
              value={depositForm.userNote}
              onChange={(event) => setDepositForm((current) => ({ ...current, userNote: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
              placeholder="Optional note"
            />
          </UserField>
          {error ? (
            <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
              {error}
            </div>
          ) : null}
          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-5">
            <ActionButton variant="secondary" onClick={closeDrawer}>
              Cancel
            </ActionButton>
            <ActionButton onClick={handleDepositSubmit}>Submit Deposit Request</ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={activeDrawer === "withdraw"}
        title="Submit Withdrawal Request"
        subtitle="Submit a withdrawal request from your wallet."
        onClose={closeDrawer}
      >
        <div className="space-y-5">
          <UserField label="Amount">
            <input
              value={withdrawalForm.amount}
              onChange={(event) =>
                setWithdrawalForm((current) => ({ ...current, amount: event.target.value.replace(/[^\d]/g, "") }))
              }
              className={userInputClassName}
              placeholder="MMK amount"
            />
          </UserField>
          <UserField label="Payment Method">
            <DropdownFilter
              label="Payment Method"
              options={paymentMethodOptions}
              selectedValue={withdrawalForm.paymentMethod}
              onChange={(value) =>
                setWithdrawalForm((current) => ({ ...current, paymentMethod: value as PaymentMethod }))
              }
            />
          </UserField>
          <UserField label="Account Holder Name">
            <input
              value={withdrawalForm.accountHolderName}
              onChange={(event) =>
                setWithdrawalForm((current) => ({ ...current, accountHolderName: event.target.value }))
              }
              className={userInputClassName}
              placeholder="Enter account holder name"
            />
          </UserField>
          <UserField label="Account Number / Phone">
            <input
              value={withdrawalForm.accountNumber}
              onChange={(event) =>
                setWithdrawalForm((current) => ({ ...current, accountNumber: event.target.value }))
              }
              className={userInputClassName}
              placeholder="Enter account number or phone"
            />
          </UserField>
          <UserField label="User Note">
            <textarea
              value={withdrawalForm.userNote}
              onChange={(event) =>
                setWithdrawalForm((current) => ({ ...current, userNote: event.target.value }))
              }
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
              placeholder="Optional note"
            />
          </UserField>
          {error ? (
            <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
              {error}
            </div>
          ) : null}
          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-5">
            <ActionButton variant="secondary" onClick={closeDrawer}>
              Cancel
            </ActionButton>
            <ActionButton onClick={handleWithdrawalSubmit}>Submit Withdrawal Request</ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={selectedRequest !== null}
        title={selectedRequest ? `${selectedRequest.type} Request` : "Wallet Request"}
        subtitle="Request detail"
        onClose={() => setSelectedRequest(null)}
      >
        {selectedRequest ? (
          <div className="space-y-4">
            {[
              ["Type", selectedRequest.type],
              ["Amount", formatMmk(selectedRequest.amount)],
              ["Method", selectedRequest.method],
              ["Reference / Account", selectedRequest.referenceOrAccount],
              ["Status", selectedRequest.status],
              ["Created At", selectedRequest.createdAt],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  {label}
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
