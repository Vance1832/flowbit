"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  approveDepositRequest,
  getAdminDepositRequests,
  rejectDepositRequest,
  type ApiDepositRequest,
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
import { downloadFromApi } from "@/lib/api/client";
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
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Review", value: "in_review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const paymentMethodOptions: DropdownOption[] = [
  { label: "All", value: "all" },
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
    case "in_review":
      return "info";
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "neutral";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "in_review":
      return "In Review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
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

export function DepositRequestsScreen({ operatorName = "Owner" }: { operatorName?: string }) {
  const [requests, setRequests] = useState<ApiDepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFromApi(
        "/api/wallets/admin/deposits/export/",
        "flowbit-deposit-requests.csv",
      );
    } catch {
      setError("Unable to export deposit requests.");
    } finally {
      setExporting(false);
    }
  }
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

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminDepositRequests();
      setRequests(ensureResults(response));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load deposit requests.");
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
    function priorityRank(request: ApiDepositRequest) {
      if (request.status === "pending" && !request.assigned_to_name) return 0;
      if (request.status === "in_review") return 1;
      if (request.status === "approved") return 2;
      return 3;
    }

    return requests
      .filter((request) => {
        const matchesSearch =
          searchTerm.trim() === "" ||
          `${request.user_name ?? ""} ${request.user_phone ?? ""} ${request.transaction_reference ?? ""}`
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
        const assignedName = request.assigned_to_name ?? null;
        const matchesAssignment =
          assignmentFilter === "all" ||
          (assignmentFilter === "mine" && assignedName === operatorName) ||
          (assignmentFilter === "unassigned" && !assignedName);

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
    const inReview = requests.filter((request) => request.status === "in_review");
    const approvedToday = requests.filter(
      (request) =>
        request.status === "approved" &&
        formatDateTime(request.reviewed_at ?? request.updated_at).startsWith(todayDateString()),
    );
    const rejectedToday = requests.filter(
      (request) =>
        request.status === "rejected" &&
        formatDateTime(request.reviewed_at ?? request.updated_at).startsWith(todayDateString()),
    );

    const total = (items: ApiDepositRequest[]) =>
      items.reduce((sum, item) => sum + Number(item.amount), 0);

    return [
      {
        title: "Pending Review",
        value: `${pending.length}`,
        delta: formatMmkAmount(total(pending)),
        tone: "warning" as const,
        detail: "Awaiting first review",
      },
      {
        title: "In Review",
        value: `${inReview.length}`,
        delta: formatMmkAmount(total(inReview)),
        tone: "neutral" as const,
        detail: "Currently assigned for checking",
      },
      {
        title: "Approved Today",
        value: `${approvedToday.length}`,
        delta: formatMmkAmount(total(approvedToday)),
        tone: "positive" as const,
        detail: "Confirmed and credited",
      },
      {
        title: "Rejected Today",
        value: `${rejectedToday.length}`,
        delta: formatMmkAmount(total(rejectedToday)),
        tone: "negative" as const,
        detail: "Rejected after proof review",
      },
    ];
  }, [requests]);

  const columns: TableColumn<ApiDepositRequest>[] = [
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
      key: "transactionReference",
      header: "Reference",
      className: "whitespace-nowrap",
      render: (row) => row.transaction_reference ?? "—",
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
      render: (row) => row.assigned_to_name ?? "—",
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
          {row.status === "pending" || row.status === "in_review" ? "Review" : "View"}
        </button>
      ),
    },
  ];

  async function handleApprove() {
    if (!selectedRequest) return;
    try {
      await approveDepositRequest(selectedRequest.id, staffNote);
      setApproveOpen(false);
      await loadRequests();
      setSelectedRequestId(selectedRequest.id);
    } catch (approveError) {
      setActionError(
        approveError instanceof Error ? approveError.message : "Unable to approve deposit.",
      );
    }
  }

  async function handleReject() {
    if (!selectedRequest) return;
    try {
      await rejectDepositRequest(selectedRequest.id, staffNote);
      setRejectOpen(false);
      await loadRequests();
      setSelectedRequestId(selectedRequest.id);
    } catch (rejectError) {
      setActionError(
        rejectError instanceof Error ? rejectError.message : "Unable to reject deposit.",
      );
    }
  }

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Deposit Requests
            </h1>
          </div>
          <ActionButton variant="secondary" disabled={exporting} onClick={handleExport}>
            {exporting ? "Exporting…" : "Export CSV"}
          </ActionButton>
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
                options={assignmentOptions}
                selectedValue={assignmentFilter}
                onChange={setAssignmentFilter}
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title="Deposit Request List"
          rows={filteredRequests}
          columns={columns}
          tableClassName="min-w-[1160px]"
          emptyState={
            loading ? (
              <EmptyState title="Loading deposit requests" description="Fetching the latest queue from the backend." />
            ) : (
              <EmptyState title="No deposit requests found" description="No deposit requests matched the current filters." />
            )
          }
        />
      </div>

      <DetailDrawer
        open={selectedRequest !== null}
        title="Deposit Request Detail"
        subtitle={selectedRequest?.transaction_reference ?? undefined}
        onClose={() => {
          setSelectedRequestId(null);
          setApproveOpen(false);
          setRejectOpen(false);
          setActionError("");
        }}
      >
        {selectedRequest ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["User name", selectedRequest.user_name ?? "—"],
                ["Phone", selectedRequest.user_phone ?? "—"],
                ["Deposit amount", formatMmkAmount(selectedRequest.amount)],
                ["Payment method", selectedRequest.payment_method ?? "—"],
                ["Sender account name", selectedRequest.sender_account_name ?? "—"],
                ["Transaction reference", selectedRequest.transaction_reference ?? "—"],
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
              <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Proof Screenshot
                </p>
                {selectedRequest.proof_image_url ? (
                  <a
                    href={selectedRequest.proof_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] transition hover:border-[var(--color-primary)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedRequest.proof_image_url}
                      alt="Payment proof screenshot"
                      className="max-h-72 w-full object-contain"
                    />
                    <span className="block px-3 py-2 text-center text-xs text-[var(--color-muted-foreground)]">
                      Click to open full size
                    </span>
                  </a>
                ) : (
                  <div className="mt-3 flex h-36 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-center">
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      No proof image uploaded.
                    </p>
                  </div>
                )}
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

            {actionError ? (
              <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
                {actionError}
              </div>
            ) : null}

            {selectedRequest.status === "pending" || selectedRequest.status === "in_review" ? (
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={() => setApproveOpen(true)}>Approve Deposit</ActionButton>
                <ActionButton variant="danger" onClick={() => setRejectOpen(true)}>
                  Reject Deposit
                </ActionButton>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  This deposit request is already marked as {statusLabel(selectedRequest.status).toLowerCase()}.
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
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
      />

      <ConfirmModal
        open={rejectOpen && selectedRequest !== null}
        title="Reject Deposit?"
        description="This will reject the deposit request after payment proof review."
        confirmLabel="Reject Deposit"
        tone="danger"
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />
    </>
  );
}
