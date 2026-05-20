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

type DepositStatus = "Pending" | "In Review" | "Approved" | "Rejected";
type PaymentMethod = "WavePay" | "KPay" | "Bank Transfer";

type DepositRequest = {
  id: string;
  user: string;
  phone: string;
  amount: string;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  status: DepositStatus;
  assignedTo: string | null;
  submittedAt: string;
  walletBalance: string;
  senderAccountName: string;
  proofLabel: string;
  userNote: string;
  staffNote: string;
};

const CURRENT_OPERATOR = "Owner";

const statusOptions: DropdownOption[] = [
  { label: "All", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "In Review", value: "In Review" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const paymentMethodOptions: DropdownOption[] = [
  { label: "All", value: "All" },
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

const assignedOptions: DropdownOption[] = [
  { label: "All Requests", value: "All" },
  { label: "My Queue", value: "Assigned to Me" },
  { label: "Unassigned", value: "Unassigned" },
];

const initialRequests: DepositRequest[] = [
  {
    id: "dep-1",
    user: "Flow Test User",
    phone: "+959777777777",
    amount: "MMK 50,000",
    paymentMethod: "WavePay",
    transactionReference: "DEP-FLOW-001",
    status: "Pending",
    assignedTo: null,
    submittedAt: "2026-06-30 10:30",
    walletBalance: "MMK 120,000",
    senderAccountName: "Flow Test User",
    proofLabel: "WavePay payment proof",
    userNote: "Deposit for TEST02 entries.",
    staffNote: "",
  },
  {
    id: "dep-2",
    user: "Aung Min",
    phone: "+959123456789",
    amount: "MMK 100,000",
    paymentMethod: "KPay",
    transactionReference: "KP-223912",
    status: "In Review",
    assignedTo: "Staff One",
    submittedAt: "2026-06-30 10:20",
    walletBalance: "MMK 40,000",
    senderAccountName: "Aung Min",
    proofLabel: "KPay receipt",
    userNote: "Please confirm quickly.",
    staffNote: "Checking receipt details.",
  },
  {
    id: "dep-3",
    user: "Mya Hnin",
    phone: "+959888777666",
    amount: "MMK 200,000",
    paymentMethod: "WavePay",
    transactionReference: "WP-889122",
    status: "Approved",
    assignedTo: "Admin",
    submittedAt: "2026-06-30 09:40",
    walletBalance: "MMK 550,000",
    senderAccountName: "Mya Hnin",
    proofLabel: "WavePay screenshot",
    userNote: "Top up for next period.",
    staffNote: "Approved after proof verification.",
  },
];

function statusTone(status: DepositStatus): StatusTone {
  switch (status) {
    case "Pending":
      return "warning";
    case "In Review":
      return "info";
    case "Approved":
      return "success";
    case "Rejected":
      return "danger";
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

export function DepositRequestsScreen() {
  const [requests, setRequests] = useState<DepositRequest[]>(initialRequests);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const selectedRequest =
    requests.find((request) => request.id === selectedRequestId) ?? null;

  const filteredRequests = useMemo(() => {
    function priorityRank(request: DepositRequest) {
      if (request.status === "Pending" && request.assignedTo === null) return 0;
      if (request.status === "In Review") return 1;
      if (request.status === "Approved") return 2;
      return 3;
    }

    return requests
      .filter((request) => {
        const matchesSearch =
          searchTerm.trim() === "" ||
          `${request.user} ${request.phone} ${request.transactionReference}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "All" || request.status === statusFilter;
        const matchesMethod =
          paymentMethodFilter === "All" ||
          request.paymentMethod === paymentMethodFilter;
        const matchesDate =
          dateFilter === "All Dates" ||
          (dateFilter === "Today" && request.submittedAt.startsWith("2026-06-30")) ||
          (dateFilter === "This Week" &&
            request.submittedAt >= "2026-06-24" &&
            request.submittedAt <= "2026-06-30 23:59") ||
          (dateFilter === "This Month" && request.submittedAt.startsWith("2026-06"));
        const matchesAssigned =
          assignedFilter === "All" ||
          (assignedFilter === "Assigned to Me" &&
            request.assignedTo === CURRENT_OPERATOR) ||
          (assignedFilter === "Unassigned" && request.assignedTo === null);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesMethod &&
          matchesDate &&
          matchesAssigned
        );
      })
      .sort((left, right) => {
        const rankDiff = priorityRank(left) - priorityRank(right);
        if (rankDiff !== 0) return rankDiff;
        return right.submittedAt.localeCompare(left.submittedAt);
      });
  }, [assignedFilter, dateFilter, paymentMethodFilter, requests, searchTerm, statusFilter]);

  const columns: TableColumn<DepositRequest>[] = [
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
      key: "transactionReference",
      header: "Reference",
      className: "whitespace-nowrap",
      render: (row) => row.transactionReference,
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
          {row.status === "Pending" || row.status === "In Review" ? "Review" : "View"}
        </button>
      ),
    },
  ];

  function updateSelectedRequest(next: Partial<DepositRequest>) {
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
      value: "12",
      delta: "MMK 450,000",
      tone: "warning" as const,
      detail: "Awaiting first review",
    },
    {
      title: "In Review",
      value: "5",
      delta: "MMK 180,000",
      tone: "neutral" as const,
      detail: "Currently assigned for checking",
    },
    {
      title: "Approved Today",
      value: "8",
      delta: "MMK 320,000",
      tone: "positive" as const,
      detail: "Confirmed and credited",
    },
    {
      title: "Rejected Today",
      value: "2",
      delta: "MMK 30,000",
      tone: "negative" as const,
      detail: "Rejected after proof review",
    },
  ];

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Deposit Requests
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Review, assign, approve, or reject user deposit requests.
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
                placeholder="Search name, phone, or reference"
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
                options={assignedOptions}
                selectedValue={assignedFilter}
                onChange={setAssignedFilter}
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title="Deposit Request List"
          rows={filteredRequests}
          columns={columns}
          tableClassName="min-w-[1160px]"
        />
      </div>

      <DetailDrawer
        open={selectedRequest !== null}
        title="Deposit Request Detail"
        subtitle={selectedRequest?.transactionReference}
        onClose={() => {
          setSelectedRequestId(null);
          setApproveOpen(false);
          setRejectOpen(false);
        }}
      >
        {selectedRequest ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["User name", selectedRequest.user],
                ["Phone", selectedRequest.phone],
                ["Current wallet balance", selectedRequest.walletBalance],
                ["Deposit amount", selectedRequest.amount],
                ["Payment method", selectedRequest.paymentMethod],
                ["Sender account name", selectedRequest.senderAccountName],
                ["Transaction reference", selectedRequest.transactionReference],
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
              <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Proof Screenshot
                </p>
                <div className="mt-3 flex h-36 flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-center">
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    Payment proof preview
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    Click to enlarge
                  </p>
                  <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                    {selectedRequest.proofLabel}
                  </p>
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

            {selectedRequest.status === "Pending" ||
            selectedRequest.status === "In Review" ? (
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={() => setApproveOpen(true)}>
                  Approve Deposit
                </ActionButton>
                <ActionButton variant="danger" onClick={() => setRejectOpen(true)}>
                  Reject Deposit
                </ActionButton>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  This deposit request is already marked as {selectedRequest.status.toLowerCase()}.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmModal
        open={approveOpen && selectedRequest !== null}
        title="Approve Deposit?"
        description="This will approve the deposit request after payment proof review."
        confirmLabel="Approve Deposit"
        cancelLabel="Cancel"
        onClose={() => setApproveOpen(false)}
        onConfirm={() => {
          updateSelectedRequest({
            status: "Approved",
            assignedTo: selectedRequest?.assignedTo ?? CURRENT_OPERATOR,
          });
          setApproveOpen(false);
        }}
      />

      <ConfirmModal
        open={rejectOpen && selectedRequest !== null}
        title="Reject Deposit?"
        description="This will reject the deposit request after payment proof review."
        confirmLabel="Reject Deposit"
        cancelLabel="Cancel"
        tone="danger"
        onClose={() => setRejectOpen(false)}
        onConfirm={() => {
          updateSelectedRequest({
            status: "Rejected",
            assignedTo: selectedRequest?.assignedTo ?? CURRENT_OPERATOR,
          });
          setRejectOpen(false);
        }}
      />
    </>
  );
}
