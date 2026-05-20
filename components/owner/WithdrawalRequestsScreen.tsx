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
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusTone, TableColumn } from "@/lib/types";

type WithdrawalStatus = "Pending" | "Approved" | "Rejected" | "Paid";
type PaymentMethod = "WavePay" | "KPay" | "Bank Transfer";

type WithdrawalRequest = {
  id: string;
  user: string;
  phone: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentAccount: string;
  accountHolderName: string;
  status: WithdrawalStatus;
  assignedTo: string | null;
  submittedAt: string;
  availableWalletBalance: string;
  lockedBalance: string;
  userNote: string;
  staffNote: string;
};

const statusOptions: DropdownOption[] = [
  { label: "All Status", value: "All Status" },
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
  { label: "Paid", value: "Paid" },
];

const paymentMethodOptions: DropdownOption[] = [
  { label: "All Methods", value: "All Methods" },
  { label: "WavePay", value: "WavePay" },
  { label: "KPay", value: "KPay" },
  { label: "Bank Transfer", value: "Bank Transfer" },
];

const dateOptions: DropdownOption[] = [
  { label: "All Dates", value: "All Dates" },
  { label: "Today", value: "Today" },
  { label: "This Week", value: "This Week" },
  { label: "This Month", value: "This Month" },
];

const assignmentOptions: DropdownOption[] = [
  { label: "All Requests", value: "All Requests" },
  { label: "My Queue", value: "My Queue" },
  { label: "Unassigned", value: "Unassigned" },
];

const initialRequests: WithdrawalRequest[] = [
  {
    id: "wd-1",
    user: "Flow Test User",
    phone: "+959777777777",
    amount: "MMK 10,000",
    paymentMethod: "WavePay",
    paymentAccount: "0912345678",
    accountHolderName: "Flow Test User",
    status: "Pending",
    assignedTo: null,
    submittedAt: "2026-06-30 11:00",
    availableWalletBalance: "MMK 35,000",
    lockedBalance: "MMK 0",
    userNote: "Please send to my WavePay account.",
    staffNote: "",
  },
  {
    id: "wd-2",
    user: "Aung Min",
    phone: "+959123456789",
    amount: "MMK 50,000",
    paymentMethod: "KPay",
    paymentAccount: "09******789",
    accountHolderName: "Aung Min",
    status: "Approved",
    assignedTo: "Staff One",
    submittedAt: "2026-06-30 10:40",
    availableWalletBalance: "MMK 120,000",
    lockedBalance: "MMK 50,000",
    userNote: "Use the registered KPay account.",
    staffNote: "Approved and waiting for payment send-out.",
  },
  {
    id: "wd-3",
    user: "Mya Hnin",
    phone: "+959888777666",
    amount: "MMK 30,000",
    paymentMethod: "WavePay",
    paymentAccount: "09******666",
    accountHolderName: "Mya Hnin",
    status: "Paid",
    assignedTo: "Admin",
    submittedAt: "2026-06-30 09:30",
    availableWalletBalance: "MMK 0",
    lockedBalance: "MMK 0",
    userNote: "Send as soon as approved.",
    staffNote: "Paid and cleared.",
  },
];

function statusTone(status: WithdrawalStatus): StatusTone {
  switch (status) {
    case "Pending":
      return "warning";
    case "Approved":
      return "info";
    case "Rejected":
      return "danger";
    case "Paid":
      return "success";
  }
}

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

export function WithdrawalRequestsScreen({
  operatorName = "Owner",
}: {
  operatorName?: string;
}) {
  const [requests, setRequests] = useState<WithdrawalRequest[]>(initialRequests);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All Methods");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [assignmentFilter, setAssignmentFilter] = useState("All Requests");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);

  const selectedRequest =
    requests.find((request) => request.id === selectedRequestId) ?? null;

  const filteredRequests = useMemo(() => {
    function priorityRank(request: WithdrawalRequest) {
      if (request.status === "Pending" && request.assignedTo === null) return 0;
      if (request.status === "Approved") return 1;
      if (request.status === "Paid") return 2;
      return 3;
    }

    return requests
      .filter((request) => {
        const matchesSearch =
          searchTerm.trim() === "" ||
          `${request.user} ${request.phone} ${request.paymentAccount}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "All Status" || request.status === statusFilter;
        const matchesMethod =
          paymentMethodFilter === "All Methods" ||
          request.paymentMethod === paymentMethodFilter;
        const matchesDate =
          dateFilter === "All Dates" ||
          (dateFilter === "Today" && request.submittedAt.startsWith("2026-06-30")) ||
          (dateFilter === "This Week" &&
            request.submittedAt >= "2026-06-24" &&
            request.submittedAt <= "2026-06-30 23:59") ||
          (dateFilter === "This Month" && request.submittedAt.startsWith("2026-06"));
        const matchesAssignment =
          assignmentFilter === "All Requests" ||
          (assignmentFilter === "My Queue" && request.assignedTo === operatorName) ||
          (assignmentFilter === "Unassigned" && request.assignedTo === null);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesMethod &&
          matchesDate &&
          matchesAssignment
        );
      })
      .sort((left, right) => {
        const rankDiff = priorityRank(left) - priorityRank(right);
        if (rankDiff !== 0) return rankDiff;
        return right.submittedAt.localeCompare(left.submittedAt);
      });
  }, [
    assignmentFilter,
    dateFilter,
    operatorName,
    paymentMethodFilter,
    requests,
    searchTerm,
    statusFilter,
  ]);

  const columns: TableColumn<WithdrawalRequest>[] = [
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
      key: "amount",
      header: "Amount",
      className: "whitespace-nowrap",
      render: (row) => row.amount,
    },
    {
      key: "paymentMethod",
      header: "Payment Method",
      className: "whitespace-nowrap",
      render: (row) => row.paymentMethod,
    },
    {
      key: "paymentAccount",
      header: "Payment Account",
      className: "whitespace-nowrap",
      render: (row) => row.paymentAccount,
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
      key: "assignedTo",
      header: "Assigned To",
      className: "whitespace-nowrap",
      render: (row) => row.assignedTo ?? "—",
    },
    {
      key: "submittedAt",
      header: "Submitted",
      className: "whitespace-nowrap",
      render: (row) => row.submittedAt,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[88px] whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => setSelectedRequestId(row.id)}
        >
          {row.status === "Paid" || row.status === "Rejected" ? "View" : "Review"}
        </button>
      ),
    },
  ];

  function updateSelectedRequest(next: Partial<WithdrawalRequest>) {
    if (!selectedRequest) return;
    setRequests((current) =>
      current.map((request) =>
        request.id === selectedRequest.id ? { ...request, ...next } : request,
      ),
    );
  }

  const summaryCards = [
    {
      title: "Pending Review",
      value: "5",
      delta: "MMK 180,000",
      tone: "warning" as const,
      detail: "Awaiting staff review",
    },
    {
      title: "Approved Waiting Payment",
      value: "3",
      delta: "MMK 120,000",
      tone: "neutral" as const,
      detail: "Ready to be marked paid",
    },
    {
      title: "Paid Today",
      value: "7",
      delta: "MMK 280,000",
      tone: "positive" as const,
      detail: "Payment sent successfully",
    },
    {
      title: "Rejected Today",
      value: "1",
      delta: "MMK 20,000",
      tone: "negative" as const,
      detail: "Rejected after balance review",
    },
  ];

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Withdrawal Requests
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Review, approve, reject, and mark user withdrawal requests as paid.
            </p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </section>

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr_1fr_1fr_1fr]">
            <FilterField label="Search">
              <SearchInput
                placeholder="Search name, phone, or payment account"
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
            <FilterField label="Payment Method">
              <DropdownFilter
                label="Payment Method"
                options={paymentMethodOptions}
                selectedValue={paymentMethodFilter}
                onChange={setPaymentMethodFilter}
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
            <FilterField label="Assignment">
              <DropdownFilter
                label="Assignment"
                options={assignmentOptions}
                selectedValue={assignmentFilter}
                onChange={setAssignmentFilter}
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title="Withdrawal Request List"
          rows={filteredRequests}
          columns={columns}
          tableClassName="min-w-[1180px]"
        />
      </div>

      <DetailDrawer
        open={selectedRequest !== null}
        title="Withdrawal Request Detail"
        subtitle={selectedRequest?.user}
        onClose={() => {
          setSelectedRequestId(null);
          setApproveOpen(false);
          setRejectOpen(false);
          setPaidOpen(false);
        }}
      >
        {selectedRequest ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["User name", selectedRequest.user],
                ["Phone", selectedRequest.phone],
                ["Available wallet balance", selectedRequest.availableWalletBalance],
                ["Locked balance", selectedRequest.lockedBalance],
                ["Withdrawal amount", selectedRequest.amount],
                ["Payment method", selectedRequest.paymentMethod],
                ["Account holder name", selectedRequest.accountHolderName],
                ["Account number/phone", selectedRequest.paymentAccount],
                ["User note", selectedRequest.userNote || "—"],
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
                  <StatusBadge status={statusTone(selectedRequest.status)}>
                    {selectedRequest.status}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-foreground)]">
                Staff note
              </label>
              <textarea
                value={selectedRequest.staffNote}
                onChange={(event) =>
                  updateSelectedRequest({ staffNote: event.target.value })
                }
                className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
              />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm leading-6 text-amber-950">
                Approving withdrawal locks the requested amount. Mark as Paid only after payment has been sent.
              </p>
            </div>

            {selectedRequest.status === "Pending" ? (
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={() => setApproveOpen(true)}>
                  Approve Withdrawal
                </ActionButton>
                <ActionButton variant="danger" onClick={() => setRejectOpen(true)}>
                  Reject Withdrawal
                </ActionButton>
              </div>
            ) : selectedRequest.status === "Approved" ? (
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={() => setPaidOpen(true)}>
                  Mark as Paid
                </ActionButton>
                <ActionButton variant="danger" onClick={() => setRejectOpen(true)}>
                  Reject Withdrawal
                </ActionButton>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  This withdrawal request is already marked as {selectedRequest.status.toLowerCase()}.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmModal
        open={approveOpen && selectedRequest !== null}
        title="Approve Withdrawal?"
        description="This will approve the withdrawal request and lock the requested amount for payment processing."
        confirmLabel="Approve Withdrawal"
        cancelLabel="Cancel"
        onClose={() => setApproveOpen(false)}
        onConfirm={() => {
          updateSelectedRequest({
            status: "Approved",
            assignedTo: selectedRequest?.assignedTo ?? operatorName,
            lockedBalance: selectedRequest?.amount ?? "MMK 0",
          });
          setApproveOpen(false);
        }}
      />

      <ConfirmModal
        open={rejectOpen && selectedRequest !== null}
        title="Reject Withdrawal?"
        description="This will reject the withdrawal request."
        confirmLabel="Reject Withdrawal"
        cancelLabel="Cancel"
        tone="danger"
        onClose={() => setRejectOpen(false)}
        onConfirm={() => {
          updateSelectedRequest({
            status: "Rejected",
            assignedTo: selectedRequest?.assignedTo ?? operatorName,
            lockedBalance: "MMK 0",
          });
          setRejectOpen(false);
        }}
      />

      <ConfirmModal
        open={paidOpen && selectedRequest !== null}
        title="Mark Withdrawal as Paid?"
        description="This will mark the approved withdrawal request as paid after payment has been sent."
        confirmLabel="Mark as Paid"
        cancelLabel="Cancel"
        onClose={() => setPaidOpen(false)}
        onConfirm={() => {
          updateSelectedRequest({
            status: "Paid",
            lockedBalance: "MMK 0",
            assignedTo: selectedRequest?.assignedTo ?? operatorName,
          });
          setPaidOpen(false);
        }}
      />
    </>
  );
}
