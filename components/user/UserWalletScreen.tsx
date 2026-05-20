"use client";

import { useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatMmk,
  useUserApp,
  type UserWalletTransaction,
} from "@/components/providers/UserAppProvider";
import {
  UserField,
  UserPageHeader,
  UserSummaryCard,
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

export function UserWalletScreen() {
  const {
    availableBalance,
    lockedBalance,
    pendingDeposit,
    pendingWithdrawal,
    walletTransactions,
    submitDepositRequest,
    submitWithdrawalRequest,
  } = useUserApp();
  const [activeDrawer, setActiveDrawer] = useState<"deposit" | "withdraw" | null>(null);
  const [depositForm, setDepositForm] = useState({
    amount: "",
    paymentMethod: "WavePay" as PaymentMethod,
    senderAccountName: "",
    transactionReference: "",
    userNote: "",
  });
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    paymentMethod: "WavePay" as PaymentMethod,
    accountHolderName: "",
    accountNumber: "",
    userNote: "",
  });
  const [message, setMessage] = useState("");

  const orderedTransactions = useMemo(() => {
    return [...walletTransactions].sort((left, right) => right.date.localeCompare(left.date));
  }, [walletTransactions]);

  return (
    <>
      <div className="space-y-6">
        <UserPageHeader
          title="Wallet"
          subtitle="Manage deposits, withdrawals, and wallet transactions."
        />

        {message ? (
          <div className="rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            {message}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <UserSummaryCard
            title="Available Balance"
            value={formatMmk(availableBalance)}
            detail="Available for receipt payments"
          />
          <UserSummaryCard
            title="Locked Balance"
            value={formatMmk(lockedBalance)}
            detail="No pending holds"
          />
          <UserSummaryCard
            title="Pending Deposit"
            value={formatMmk(pendingDeposit)}
            detail="Waiting for review"
          />
          <UserSummaryCard
            title="Pending Withdrawal"
            value={formatMmk(pendingWithdrawal)}
            detail="Waiting for processing"
          />
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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
          description="Latest wallet movements and request activity."
          columns={transactionColumns}
          rows={orderedTransactions}
          tableClassName="min-w-[980px]"
        />
      </div>

      <DetailDrawer
        open={activeDrawer === "deposit"}
        title="Deposit"
        subtitle="Submit a wallet funding request for review."
        onClose={() => setActiveDrawer(null)}
      >
        <div className="space-y-5">
          <UserField label="Amount">
            <input
              value={depositForm.amount}
              onChange={(event) => setDepositForm((current) => ({ ...current, amount: event.target.value }))}
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
            <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] px-4 py-6 text-sm text-[var(--color-muted-foreground)]">
              Proof image placeholder
            </div>
          </UserField>
          <UserField label="User Note">
            <textarea
              value={depositForm.userNote}
              onChange={(event) => setDepositForm((current) => ({ ...current, userNote: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
              placeholder="Optional note"
            />
          </UserField>
          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-5">
            <ActionButton variant="secondary" onClick={() => setActiveDrawer(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              onClick={() => {
                submitDepositRequest({
                  amount: Number(depositForm.amount || 0),
                  paymentMethod: depositForm.paymentMethod,
                  senderAccountName: depositForm.senderAccountName,
                  transactionReference: depositForm.transactionReference,
                  userNote: depositForm.userNote,
                });
                setMessage("Deposit request submitted in local mock state.");
                setDepositForm({
                  amount: "",
                  paymentMethod: "WavePay",
                  senderAccountName: "",
                  transactionReference: "",
                  userNote: "",
                });
                setActiveDrawer(null);
              }}
            >
              Submit Deposit Request
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={activeDrawer === "withdraw"}
        title="Withdraw"
        subtitle="Submit a withdrawal request from your wallet."
        onClose={() => setActiveDrawer(null)}
      >
        <div className="space-y-5">
          <UserField label="Amount">
            <input
              value={withdrawalForm.amount}
              onChange={(event) =>
                setWithdrawalForm((current) => ({ ...current, amount: event.target.value }))
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
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
              placeholder="Optional note"
            />
          </UserField>
          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-5">
            <ActionButton variant="secondary" onClick={() => setActiveDrawer(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              onClick={() => {
                submitWithdrawalRequest({
                  amount: Number(withdrawalForm.amount || 0),
                  paymentMethod: withdrawalForm.paymentMethod,
                  accountHolderName: withdrawalForm.accountHolderName,
                  accountNumber: withdrawalForm.accountNumber,
                  userNote: withdrawalForm.userNote,
                });
                setMessage("Withdrawal request submitted in local mock state.");
                setWithdrawalForm({
                  amount: "",
                  paymentMethod: "WavePay",
                  accountHolderName: "",
                  accountNumber: "",
                  userNote: "",
                });
                setActiveDrawer(null);
              }}
            >
              Submit Withdrawal Request
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>
    </>
  );
}
