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
import { useTranslations } from "@/components/providers/LocaleProvider";
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

const STATUS_KEY: Record<string, string> = {
  pending: "wd.statusPending",
  approved: "wd.statusApproved",
  rejected: "wd.statusRejected",
  paid: "wd.statusPaid",
};

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
  const t = useTranslations();
  const statusLabel = (status: string) =>
    STATUS_KEY[status] ? t(STATUS_KEY[status]) : status;

  const statusOptions: DropdownOption[] = [
    { label: t("wd.allStatus"), value: "all" },
    { label: t("wd.statusPending"), value: "pending" },
    { label: t("wd.statusApproved"), value: "approved" },
    { label: t("wd.statusRejected"), value: "rejected" },
    { label: t("wd.statusPaid"), value: "paid" },
  ];
  const paymentMethodOptions: DropdownOption[] = [
    { label: t("wd.allMethods"), value: "all" },
    { label: "WavePay", value: "WavePay" },
    { label: "KPay", value: "KPay" },
    { label: "Bank Transfer", value: "Bank Transfer" },
  ];
  const dateOptions: DropdownOption[] = [
    { label: t("filters.allDates"), value: "all" },
    { label: t("filters.today"), value: "today" },
    { label: t("filters.thisWeek"), value: "week" },
    { label: t("filters.thisMonth"), value: "month" },
  ];
  const assignmentOptions: DropdownOption[] = [
    { label: t("wd.assignAll"), value: "all" },
    { label: t("wd.assignMine"), value: "mine" },
    { label: t("wd.assignUnassigned"), value: "unassigned" },
  ];

  const [requests, setRequests] = useState<ApiWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFromApi(
        "/api/wallets/admin/withdrawals/export/",
        "flowbit-withdrawal-requests.csv",
      );
    } catch {
      setError(t("wd.exportError"));
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
  const [paidOpen, setPaidOpen] = useState(false);

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminWithdrawalRequests();
      setRequests(ensureResults(response));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("wd.loadError"),
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
    // Load once on mount; loadRequests only re-reads t for an error fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        title: t("wd.cardPendingReview"),
        value: `${pending.length}`,
        delta: formatMmkAmount(total(pending)),
        tone: "warning" as const,
        detail: t("wd.pendingReviewDetail"),
      },
      {
        title: t("wd.cardApprovedWaiting"),
        value: `${approved.length}`,
        delta: formatMmkAmount(total(approved)),
        tone: "neutral" as const,
        detail: t("wd.approvedWaitingDetail"),
      },
      {
        title: t("wd.cardPaidToday"),
        value: `${paidToday.length}`,
        delta: formatMmkAmount(total(paidToday)),
        tone: "positive" as const,
        detail: t("wd.paidTodayDetail"),
      },
      {
        title: t("wd.cardRejectedToday"),
        value: `${rejectedToday.length}`,
        delta: formatMmkAmount(total(rejectedToday)),
        tone: "negative" as const,
        detail: t("wd.rejectedTodayDetail"),
      },
    ];
  }, [requests, t]);

  const columns: TableColumn<ApiWithdrawalRequest>[] = [
    {
      key: "user",
      header: t("wd.colUser"),
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.user_name ?? "—"}</span>,
    },
    {
      key: "phone",
      header: t("wd.colPhone"),
      className: "whitespace-nowrap",
      render: (row) => row.user_phone ?? "—",
    },
    {
      key: "amount",
      header: t("common.amount"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.amount),
    },
    {
      key: "paymentMethod",
      header: t("wd.colPaymentMethod"),
      className: "whitespace-nowrap",
      render: (row) => row.payment_method ?? "—",
    },
    {
      key: "paymentAccount",
      header: t("wd.colPaymentAccount"),
      className: "whitespace-nowrap",
      render: (row) => row.payment_account_number ?? "—",
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
      key: "assignedTo",
      header: t("wd.colAssignedTo"),
      className: "whitespace-nowrap",
      render: (row) => row.paid_by_name ?? row.reviewed_by_name ?? "—",
    },
    {
      key: "submittedAt",
      header: t("wd.colSubmitted"),
      className: "whitespace-nowrap",
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "actions",
      header: t("wd.colActions"),
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
          {row.status === "paid" || row.status === "rejected" ? t("common.view") : t("wd.review")}
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
        approveError instanceof Error ? approveError.message : t("wd.approveError"),
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
        rejectError instanceof Error ? rejectError.message : t("wd.rejectError"),
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
        paidError instanceof Error ? paidError.message : t("wd.paidError"),
      );
    }
  }

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              {t("wd.title")}
            </h1>
          </div>
          <ActionButton variant="secondary" disabled={exporting} onClick={handleExport}>
            {exporting ? t("wd.exporting") : t("wd.exportCsv")}
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
            <FilterField label={t("wd.filterSearch")}>
              <SearchInput
                placeholder={t("wd.searchPlaceholder")}
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
            <FilterField label={t("wd.colPaymentMethod")}>
              <DropdownFilter
                label={t("wd.colPaymentMethod")}
                options={paymentMethodOptions}
                selectedValue={paymentMethodFilter}
                onChange={setPaymentMethodFilter}
              />
            </FilterField>
            <FilterField label={t("common.date")}>
              <DropdownFilter
                label={t("common.date")}
                options={dateOptions}
                selectedValue={dateFilter}
                onChange={setDateFilter}
              />
            </FilterField>
            <FilterField label={t("wd.filterAssignment")}>
              <DropdownFilter
                label={t("wd.filterAssignment")}
                options={assignmentOptions}
                selectedValue={assignmentFilter}
                onChange={setAssignmentFilter}
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title={t("wd.tableTitle")}
          rows={filteredRequests}
          columns={columns}
          tableClassName="min-w-[1180px]"
          emptyState={
            loading ? (
              <EmptyState
                title={t("wd.loadingTitle")}
                description={t("wd.loadingDesc")}
              />
            ) : (
              <EmptyState
                title={t("wd.noneTitle")}
                description={t("wd.noneDesc")}
              />
            )
          }
        />
      </div>

      <DetailDrawer
        open={selectedRequest !== null}
        title={t("wd.detailTitle")}
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
                [t("wd.detailUserName"), selectedRequest.user_name ?? "—"],
                [t("wd.colPhone"), selectedRequest.user_phone ?? "—"],
                [t("wd.detailWithdrawalAmount"), formatMmkAmount(selectedRequest.amount)],
                [t("wd.detailPaymentMethod"), selectedRequest.payment_method ?? "—"],
                [t("wd.detailAccountHolder"), selectedRequest.payment_account_name ?? "—"],
                [t("wd.detailAccountNumber"), selectedRequest.payment_account_number ?? "—"],
                [t("wd.detailSubmittedAt"), formatDateTime(selectedRequest.created_at)],
                [t("wd.detailUserNote"), selectedRequest.user_note || "—"],
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
                  {t("common.status")}
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
                {t("wd.staffNote")}
              </label>
              <textarea
                value={staffNote}
                onChange={(event) => setStaffNote(event.target.value)}
                className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
              />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm leading-6 text-amber-950">
                {t("wd.lockWarning")}
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
                  {t("wd.approveWithdrawal")}
                </ActionButton>
                <ActionButton variant="danger" onClick={() => setRejectOpen(true)}>
                  {t("wd.rejectWithdrawal")}
                </ActionButton>
              </div>
            ) : selectedRequest.status === "approved" ? (
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={() => setPaidOpen(true)}>{t("wd.markPaid")}</ActionButton>
                <ActionButton variant="danger" onClick={() => setRejectOpen(true)}>
                  {t("wd.rejectWithdrawal")}
                </ActionButton>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {t("wd.alreadyMarked", { status: statusLabel(selectedRequest.status) })}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmModal
        open={approveOpen && selectedRequest !== null}
        title={t("wd.approveTitle")}
        description={t("wd.approveDesc")}
        confirmLabel={t("wd.approveWithdrawal")}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
      />

      <ConfirmModal
        open={rejectOpen && selectedRequest !== null}
        title={t("wd.rejectTitle")}
        description={t("wd.rejectDesc")}
        confirmLabel={t("wd.rejectWithdrawal")}
        tone="danger"
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />

      <ConfirmModal
        open={paidOpen && selectedRequest !== null}
        title={t("wd.paidTitle")}
        description={t("wd.paidDesc")}
        confirmLabel={t("wd.markPaid")}
        onClose={() => setPaidOpen(false)}
        onConfirm={handleMarkPaid}
      />
    </>
  );
}
