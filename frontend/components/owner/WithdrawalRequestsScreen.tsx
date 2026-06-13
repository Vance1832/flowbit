"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  approveWithdrawalRequest,
  getAdminWithdrawalRequests,
  markWithdrawalPaid,
  rejectWithdrawalRequest,
  type ApiWithdrawalRequest,
} from "@/lib/api/wallets";
import { ensureResults } from "@/lib/api/types";
import {
  currentMonthString,
  formatDateTime,
  formatMmkAmount,
  todayDateString,
  weekStartDateString,
} from "@/lib/format";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { DropdownFilter, type DropdownOption } from "@/components/ui/DropdownFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusTone, TableColumn } from "@/lib/types";

const statusOptions: DropdownOption[] = [
  { label: "All Status", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Paid", value: "paid" },
];

const paymentMethodOptions: DropdownOption[] = [
  { label: "All Methods", value: "all" },
  { label: "WavePay", value: "WavePay" },
  { label: "KPay", value: "KPay" },
  { label: "Bank Transfer", value: "Bank Transfer" },
];

const dateOptions: DropdownOption[] = [
  { label: "All Dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
];

const assignmentOptions: DropdownOption[] = [
  { label: "All Requests", value: "all" },
  { label: "My Queue", value: "mine" },
  { label: "Unassigned", value: "unassigned" },
];

function statusTone(status: string): StatusTone {
  switch (status) {
    case "pending":
      return "warning";
    case "approved":
      return "info";
    case "rejected":
      return "danger";
    case "paid":
      return "success";
    default:
      return "neutral";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "paid":
      return "Paid";
    default:
      return status;
  }
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
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
  const [requests, setRequests] = useState<ApiWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [staffNote, setStaffNote] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminWithdrawalRequests();
      setRequests(ensureResults(response));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load withdrawal requests.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequests();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedRequest =
    requests.find((request) => request.id === selectedRequestId) ?? null;

  const filteredRequests = useMemo(() => {
    function priorityRank(request: ApiWithdrawalRequest) {
      if (request.status === "pending") return 0;
      if (request.status === "approved") return 1;
      if (request.status === "paid") return 2;
      return 3;
    }

    return requests
      .filter((request) => {
        const matchesSearch =
          searchTerm.trim() === "" ||
          `${request.user_name ?? ""} ${request.user_phone ?? ""} ${request.payment_account_number ?? ""}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || request.status === statusFilter;
        const matchesMethod =
          paymentMethodFilter === "all" || request.payment_method === paymentMethodFilter;
        const matchesDate =
          dateFilter === "all" ||
          (dateFilter === "today" &&
            formatDateTime(request.created_at).startsWith(todayDateString())) ||
          (dateFilter === "week" &&
            formatDateTime(request.created_at).slice(0, 10) >= weekStartDateString()) ||
          (dateFilter === "month" &&
            formatDateTime(request.created_at).slice(0, 7) === currentMonthString());
        const queueOwner = request.paid_by_name ?? request.reviewed_by_name ?? null;
        const matchesAssignment =
          assignmentFilter === "all" ||
          (assignmentFilter === "mine" && queueOwner === operatorName) ||
          (assignmentFilter === "unassigned" && !queueOwner);
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
        return right.created_at.localeCompare(left.created_at);
      });
  }, [assignmentFilter, dateFilter, operatorName, paymentMethodFilter, requests, searchTerm, statusFilter]);

  const summaryCards = useMemo(() => {
    const pending = requests.filter((request) => request.status === "pending");
    const approved = requests.filter((request) => request.status === "approved");
    const paidToday = requests.filter(
      (request) =>
        request.status === "paid" &&
        formatDateTime(request.paid_at ?? request.updated_at).startsWith(todayDateString()),
    );
    const rejectedToday = requests.filter(
      (request) =>
        request.status === "rejected" &&
        formatDateTime(request.reviewed_at ?? request.updated_at).startsWith(todayDateString()),
    );

    const total = (items: ApiWithdrawalRequest[]) =>
      items.reduce((sum, item) => sum + Number(item.amount), 0);

    return [
      {
        title: "Pending Review",
        value: `${pending.length}`,
        delta: formatMmkAmount(total(pending)),
        tone: "warning" as const,
        detail: "Awaiting staff review",
      },
      {
        title: "Approved Waiting Payment",
        value: `${approved.length}`,
        delta: formatMmkAmount(total(approved)),
        tone: "neutral" as const,
        detail: "Ready to be marked paid",
      },
      {
        title: "Paid Today",
        value: `${paidToday.length}`,
        delta: formatMmkAmount(total(paidToday)),
        tone: "positive" as const,
        detail: "Payment sent successfully",
      },
      {
        title: "Rejected Today",
        value: `${rejectedToday.length}`,
        delta: formatMmkAmount(total(rejectedToday)),
        tone: "negative" as const,
        detail: "Rejected after review",
      },
    ];
  }, [requests]);

  const columns: TableColumn<ApiWithdrawalRequest>[] = [
    {
      key: "user",
      header: "User",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.user_name ?? "—"}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      className: "whitespace-nowrap",
      render: (row) => row.user_phone ?? "—",
    },
    {
      key: "amount",
      header: "Amount",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.amount),
    },
    {
      key: "paymentMethod",
      header: "Payment Method",
      className: "whitespace-nowrap",
      render: (row) => row.payment_method ?? "—",
    },
    {
      key: "paymentAccount",
      header: "Payment Account",
      className: "whitespace-nowrap",
      render: (row) => row.payment_account_number ?? "—",
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
      key: "assignedTo",
      header: "Assigned To",
      className: "whitespace-nowrap",
      render: (row) => row.paid_by_name ?? row.reviewed_by_name ?? "—",
    },
    {
      key: "submittedAt",
      header: "Submitted",
      className: "whitespace-nowrap",
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[88px] whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => {
            setSelectedRequestId(row.id);
            setStaffNote(row.staff_note ?? "");
            setActionError("");
          }}
        >
          {row.status === "paid" || row.status === "rejected" ? "View" : "Review"}
        </button>
      ),
    },
  ];

  async function handleApprove() {
    if (!selectedRequest) return;
    try {
      await approveWithdrawalRequest(selectedRequest.id, staffNote);
      setApproveOpen(false);
      await loadRequests();
      setSelectedRequestId(selectedRequest.id);
    } catch (approveError) {
      setActionError(
        approveError instanceof Error
          ? approveError.message
          : "Unable to approve withdrawal.",
      );
    }
  }

  async function handleReject() {
    if (!selectedRequest) return;
    try {
      await rejectWithdrawalRequest(selectedRequest.id, staffNote);
      setRejectOpen(false);
      await loadRequests();
      setSelectedRequestId(selectedRequest.id);
    } catch (rejectError) {
      setActionError(
        rejectError instanceof Error
          ? rejectError.message
          : "Unable to reject withdrawal.",
      );
    }
  }

  async function handleMarkPaid() {
    if (!selectedRequest) return;
    try {
      await markWithdrawalPaid(selectedRequest.id, staffNote);
      setPaidOpen(false);
      await loadRequests();
      setSelectedRequestId(selectedRequest.id);
    } catch (paidError) {
      setActionError(
        paidError instanceof Error ? paidError.message : "Unable to mark withdrawal as paid.",
      );
    }
  }

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Withdrawal Requests
            </h1>
          </div>
        </section>

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
          emptyState={
            loading ? (
              <EmptyState
                title="Loading withdrawal requests"
                description="Fetching the latest withdrawal queue from the backend."
              />
            ) : (
              <EmptyState
                title="No withdrawal requests found"
                description="No withdrawal requests matched the current filters."
              />
            )
          }
        />
      </div>

      <DetailDrawer
        open={selectedRequest !== null}
        title="Withdrawal Request Detail"
        subtitle={selectedRequest?.user_name ?? undefined}
        onClose={() => {
          setSelectedRequestId(null);
          setApproveOpen(false);
          setRejectOpen(false);
          setPaidOpen(false);
          setActionError("");
        }}
      >
        {selectedRequest ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["User name", selectedRequest.user_name ?? "—"],
                ["Phone", selectedRequest.user_phone ?? "—"],
                ["Withdrawal amount", formatMmkAmount(selectedRequest.amount)],
                ["Payment method", selectedRequest.payment_method ?? "—"],
                ["Account holder name", selectedRequest.payment_account_name ?? "—"],
                ["Account number/phone", selectedRequest.payment_account_number ?? "—"],
                ["Submitted At", formatDateTime(selectedRequest.created_at)],
                ["User note", selectedRequest.user_note || "—"],
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
                    {statusLabel(selectedRequest.status)}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-foreground)]">
                Staff note
              </label>
              <textarea
                value={staffNote}
                onChange={(event) => setStaffNote(event.target.value)}
                className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
              />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm leading-6 text-amber-950">
                Approving withdrawal locks the requested amount. Mark as Paid only after payment has been sent.
              </p>
            </div>

            {actionError ? (
              <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
                {actionError}
              </div>
            ) : null}

            {selectedRequest.status === "pending" ? (
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={() => setApproveOpen(true)}>
                  Approve Withdrawal
                </ActionButton>
                <ActionButton variant="danger" onClick={() => setRejectOpen(true)}>
                  Reject Withdrawal
                </ActionButton>
              </div>
            ) : selectedRequest.status === "approved" ? (
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={() => setPaidOpen(true)}>Mark as Paid</ActionButton>
                <ActionButton variant="danger" onClick={() => setRejectOpen(true)}>
                  Reject Withdrawal
                </ActionButton>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  This withdrawal request is already marked as {statusLabel(selectedRequest.status).toLowerCase()}.
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
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
      />

      <ConfirmModal
        open={rejectOpen && selectedRequest !== null}
        title="Reject Withdrawal?"
        description="This will reject the withdrawal request."
        confirmLabel="Reject Withdrawal"
        tone="danger"
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />

      <ConfirmModal
        open={paidOpen && selectedRequest !== null}
        title="Mark Withdrawal as Paid?"
        description="This will mark the approved withdrawal request as paid after payment has been sent."
        confirmLabel="Mark as Paid"
        onClose={() => setPaidOpen(false)}
        onConfirm={handleMarkPaid}
      />
    </>
  );
}
