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
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusTone, TableColumn } from "@/lib/types";

type ReserveTransactionType =
  | "Reserve Deposit"
  | "Settlement Funding"
  | "Cashout";

type ReserveTransaction = {
  id: string;
  type: ReserveTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdBy: string;
  createdAt: string;
};

type CashoutStatus = "Pending" | "Approved" | "Paid" | "Rejected";

type CashoutRequest = {
  id: string;
  amount: number;
  paymentMethod: string;
  accountName: string;
  accountNumber: string;
  status: CashoutStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  note: string;
};

const paymentMethodOptions: DropdownOption[] = [
  { label: "WavePay", value: "WavePay" },
  { label: "KPay", value: "KPay" },
  { label: "Bank Transfer", value: "Bank Transfer" },
];

const initialTransactions: ReserveTransaction[] = [
  {
    id: "rt-1",
    type: "Reserve Deposit",
    amount: 3000000,
    balanceBefore: 0,
    balanceAfter: 3000000,
    description: "Initial reserve deposit",
    createdBy: "Owner",
    createdAt: "2026-06-30 09:00",
  },
  {
    id: "rt-2",
    type: "Settlement Funding",
    amount: -2094000,
    balanceBefore: 3000000,
    balanceAfter: 906000,
    description: "Settlement TEST02",
    createdBy: "System",
    createdAt: "2026-06-30 15:10",
  },
  {
    id: "rt-3",
    type: "Cashout",
    amount: -500000,
    balanceBefore: 906000,
    balanceAfter: 406000,
    description: "Owner cashout",
    createdBy: "Owner",
    createdAt: "2026-06-30 16:00",
  },
];

const initialCashouts: CashoutRequest[] = [
  {
    id: "cr-1",
    amount: 500000,
    paymentMethod: "WavePay",
    accountName: "Khant Zayar",
    accountNumber: "0912345678",
    status: "Pending",
    requestedBy: "Owner",
    requestedAt: "2026-06-30 16:00",
    approvedBy: null,
    approvedAt: null,
    paidAt: null,
    note: "Owner cashout",
  },
  {
    id: "cr-2",
    amount: 300000,
    paymentMethod: "KPay",
    accountName: "Admin Account",
    accountNumber: "09******321",
    status: "Paid",
    requestedBy: "Owner",
    requestedAt: "2026-06-20 11:20",
    approvedBy: "Owner",
    approvedAt: "2026-06-20 11:35",
    paidAt: "2026-06-20 11:50",
    note: "Approved owner transfer",
  },
];

function formatMMK(amount: number) {
  const absolute = Math.abs(amount).toLocaleString("en-US");
  return `${amount < 0 ? "-" : ""}MMK ${absolute}`;
}

function nowStamp() {
  return "2026-06-30 16:30";
}

function typeTone(type: ReserveTransactionType): StatusTone {
  switch (type) {
    case "Reserve Deposit":
      return "success";
    case "Settlement Funding":
      return "warning";
    case "Cashout":
      return "neutral";
  }
}

function cashoutTone(status: CashoutStatus): StatusTone {
  switch (status) {
    case "Pending":
      return "warning";
    case "Approved":
      return "info";
    case "Paid":
      return "success";
    case "Rejected":
      return "danger";
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
  "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30";

export function CompanyReserveScreen() {
  const [transactions, setTransactions] =
    useState<ReserveTransaction[]>(initialTransactions);
  const [cashouts, setCashouts] = useState<CashoutRequest[]>(initialCashouts);
  const [reserveBalance, setReserveBalance] = useState(3000000);
  const [reserveDepositsTotal, setReserveDepositsTotal] = useState(5000000);
  const [settlementFundingTotal] = useState(2094000);
  const [depositDrawerOpen, setDepositDrawerOpen] = useState(false);
  const [cashoutDrawerOpen, setCashoutDrawerOpen] = useState(false);
  const [selectedCashoutId, setSelectedCashoutId] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDescription, setDepositDescription] = useState("");
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("WavePay");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cashoutNote, setCashoutNote] = useState("");

  const selectedCashout =
    cashouts.find((cashout) => cashout.id === selectedCashoutId) ?? null;

  const pendingCashouts = cashouts
    .filter((cashout) => cashout.status === "Pending")
    .reduce((sum, cashout) => sum + cashout.amount, 0);

  const transactionColumns: TableColumn<ReserveTransaction>[] = [
    {
      key: "type",
      header: "Type",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={typeTone(row.type)}>{row.type}</StatusBadge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "whitespace-nowrap",
      render: (row) => (
        <span
          className={
            row.amount >= 0
              ? "font-medium text-[var(--color-success)]"
              : "font-medium text-[var(--color-danger)]"
          }
        >
          {`${row.amount >= 0 ? "+" : "-"}MMK ${Math.abs(row.amount).toLocaleString("en-US")}`}
        </span>
      ),
    },
    {
      key: "balanceBefore",
      header: "Balance Before",
      className: "whitespace-nowrap",
      render: (row) => formatMMK(row.balanceBefore),
    },
    {
      key: "balanceAfter",
      header: "Balance After",
      className: "whitespace-nowrap",
      render: (row) => formatMMK(row.balanceAfter),
    },
    {
      key: "description",
      header: "Description",
      render: (row) => row.description,
    },
    {
      key: "createdBy",
      header: "Created By",
      className: "whitespace-nowrap",
      render: (row) => row.createdBy,
    },
    {
      key: "createdAt",
      header: "Created At",
      className: "whitespace-nowrap",
      render: (row) => row.createdAt,
    },
  ];

  const cashoutColumns: TableColumn<CashoutRequest>[] = [
    {
      key: "amount",
      header: "Amount",
      className: "whitespace-nowrap",
      render: (row) => formatMMK(row.amount),
    },
    {
      key: "paymentMethod",
      header: "Payment Method",
      className: "whitespace-nowrap",
      render: (row) => row.paymentMethod,
    },
    {
      key: "accountName",
      header: "Account Name",
      className: "whitespace-nowrap",
      render: (row) => row.accountName,
    },
    {
      key: "accountNumber",
      header: "Account Number",
      className: "whitespace-nowrap",
      render: (row) => row.accountNumber,
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={cashoutTone(row.status)}>{row.status}</StatusBadge>
      ),
    },
    {
      key: "requestedBy",
      header: "Requested By",
      className: "whitespace-nowrap",
      render: (row) => row.requestedBy,
    },
    {
      key: "requestedAt",
      header: "Requested At",
      className: "whitespace-nowrap",
      render: (row) => row.requestedAt,
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
    setPaymentMethod("WavePay");
    setAccountName("");
    setAccountNumber("");
    setCashoutNote("");
  }

  function handleAddReserve() {
    const amount = Number(depositAmount.replace(/,/g, ""));
    if (!amount) return;

    const balanceBefore = reserveBalance;
    const balanceAfter = balanceBefore + amount;

    setReserveBalance(balanceAfter);
    setReserveDepositsTotal((current) => current + amount);
    setTransactions((current) => [
      ...current,
      {
        id: `rt-${Date.now()}`,
        type: "Reserve Deposit",
        amount,
        balanceBefore,
        balanceAfter,
        description: depositDescription || "Reserve deposit",
        createdBy: "Owner",
        createdAt: nowStamp(),
      },
    ]);
    setDepositDrawerOpen(false);
    resetDepositForm();
  }

  function handleCreateCashoutRequest() {
    const amount = Number(cashoutAmount.replace(/,/g, ""));
    if (!amount) return;

    setCashouts((current) => [
      {
        id: `cr-${Date.now()}`,
        amount,
        paymentMethod,
        accountName,
        accountNumber,
        status: "Pending",
        requestedBy: "Owner",
        requestedAt: nowStamp(),
        approvedBy: null,
        approvedAt: null,
        paidAt: null,
        note: cashoutNote,
      },
      ...current,
    ]);
    setCashoutDrawerOpen(false);
    resetCashoutForm();
  }

  function handleApproveCashout() {
    if (!selectedCashout) return;

    setCashouts((current) =>
      current.map((cashout) =>
        cashout.id === selectedCashout.id
          ? {
              ...cashout,
              status: "Approved",
              approvedBy: "Owner",
              approvedAt: nowStamp(),
            }
          : cashout,
      ),
    );
    setApproveOpen(false);
  }

  function handleMarkPaid() {
    if (!selectedCashout) return;

    const balanceBefore = reserveBalance;
    const balanceAfter = balanceBefore - selectedCashout.amount;

    setReserveBalance(balanceAfter);
    setCashouts((current) =>
      current.map((cashout) =>
        cashout.id === selectedCashout.id
          ? {
              ...cashout,
              status: "Paid",
              approvedBy: cashout.approvedBy ?? "Owner",
              approvedAt: cashout.approvedAt ?? nowStamp(),
              paidAt: nowStamp(),
            }
          : cashout,
      ),
    );
    setTransactions((current) => [
      ...current,
      {
        id: `rt-${Date.now()}`,
        type: "Cashout",
        amount: -selectedCashout.amount,
        balanceBefore,
        balanceAfter,
        description: selectedCashout.note || "Company cashout",
        createdBy: "Owner",
        createdAt: nowStamp(),
      },
    ]);
    setPaidOpen(false);
  }

  function handleRejectCashout() {
    if (!selectedCashout) return;

    setCashouts((current) =>
      current.map((cashout) =>
        cashout.id === selectedCashout.id
          ? {
              ...cashout,
              status: "Rejected",
            }
          : cashout,
      ),
    );
  }

  const summaryCards = useMemo(
    () => [
      {
        title: "Current Reserve Balance",
        value: formatMMK(reserveBalance),
        delta: "Active",
        tone: "positive" as const,
        detail: "Healthy reserve level",
      },
      {
        title: "Total Reserve Deposits",
        value: formatMMK(reserveDepositsTotal),
        delta: "+MMK 3,000,000",
        tone: "positive" as const,
        detail: "This month",
      },
      {
        title: "Settlement Funding Used",
        value: formatMMK(settlementFundingTotal),
        delta: "Latest",
        tone: "warning" as const,
        detail: "TEST02",
      },
      {
        title: "Pending Cashouts",
        value: formatMMK(pendingCashouts),
        delta: `${cashouts.filter((cashout) => cashout.status === "Pending").length} request`,
        tone: "neutral" as const,
        detail: "Awaiting owner approval",
      },
    ],
    [cashouts, pendingCashouts, reserveBalance, reserveDepositsTotal, settlementFundingTotal],
  );

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Company Reserve
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Manage company reserve wallet, settlement funding, and cashout requests.
            </p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </section>

        <section className="flex flex-wrap gap-3">
          <ActionButton onClick={() => setDepositDrawerOpen(true)}>
            Add Reserve Deposit
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => setCashoutDrawerOpen(true)}>
            Create Cashout Request
          </ActionButton>
        </section>

        <DataTable
          title="Company Wallet Transaction History"
          rows={transactions}
          columns={transactionColumns}
          tableClassName="min-w-[1080px]"
        />

        <DataTable
          title="Company Cashout Requests"
          rows={cashouts}
          columns={cashoutColumns}
          tableClassName="min-w-[1040px]"
        />
      </div>

      <DetailDrawer
        open={depositDrawerOpen}
        title="Add Reserve Deposit"
        subtitle="Local mock reserve update"
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
              onChange={(event) => setDepositAmount(event.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={depositDescription}
              onChange={(event) => setDepositDescription(event.target.value)}
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            />
          </Field>
          <div className="flex justify-end gap-3">
            <ActionButton
              variant="secondary"
              onClick={() => {
                setDepositDrawerOpen(false);
                resetDepositForm();
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton onClick={handleAddReserve}>Add Reserve</ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={cashoutDrawerOpen}
        title="Create Cashout Request"
        subtitle="Local mock request"
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
              onChange={(event) => setCashoutAmount(event.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Payment Method">
            <DropdownFilter
              label="Payment Method"
              options={paymentMethodOptions}
              selectedValue={paymentMethod}
              onChange={setPaymentMethod}
            />
          </Field>
          <Field label="Account Name">
            <input
              type="text"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Account Number">
            <input
              type="text"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Note">
            <textarea
              value={cashoutNote}
              onChange={(event) => setCashoutNote(event.target.value)}
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            />
          </Field>
          <div className="flex justify-end gap-3">
            <ActionButton
              variant="secondary"
              onClick={() => {
                setCashoutDrawerOpen(false);
                resetCashoutForm();
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton onClick={handleCreateCashoutRequest}>
              Create Request
            </ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={selectedCashout !== null}
        title="Company Cashout Request"
        subtitle={selectedCashout ? formatMMK(selectedCashout.amount) : undefined}
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
                ["Amount", formatMMK(selectedCashout.amount)],
                ["Payment Method", selectedCashout.paymentMethod],
                ["Account Name", selectedCashout.accountName],
                ["Account Number", selectedCashout.accountNumber],
                ["Requested By", selectedCashout.requestedBy],
                ["Requested At", selectedCashout.requestedAt],
                ["Approved By", selectedCashout.approvedBy ?? "—"],
                ["Approved At", selectedCashout.approvedAt ?? "—"],
                ["Paid At", selectedCashout.paidAt ?? "—"],
                ["Note", selectedCashout.note || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                    {value}
                  </p>
                </div>
              ))}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={cashoutTone(selectedCashout.status)}>
                    {selectedCashout.status}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm leading-6 text-amber-950">
                Company cashout reduces reserve balance. Confirm only after reviewing payment details.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => setApproveOpen(true)}
                  disabled={selectedCashout.status !== "Pending"}
                >
                  Approve Cashout
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={() => setPaidOpen(true)}
                  disabled={selectedCashout.status !== "Approved"}
                >
                  Mark as Paid
                </ActionButton>
                <ActionButton
                  variant="danger"
                  onClick={handleRejectCashout}
                  disabled={selectedCashout.status === "Paid" || selectedCashout.status === "Rejected"}
                >
                  Reject
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
