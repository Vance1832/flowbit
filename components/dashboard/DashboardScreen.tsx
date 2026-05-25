"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronRightIcon, SparkIcon } from "@/components/icons";
import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCompanyWallets } from "@/lib/api/company";
import { getAdminResultPeriods, type ApiResultPeriod } from "@/lib/api/ledgers";
import { getSettlementBatches, type ApiSettlementBatch } from "@/lib/api/settlements";
import { ensureResults } from "@/lib/api/types";
import {
  getAdminDepositRequests,
  getAdminWithdrawalRequests,
  type ApiDepositRequest,
  type ApiWithdrawalRequest,
} from "@/lib/api/wallets";
import { formatDateOnly, formatMmkAmount, formatTimeOnly } from "@/lib/format";
import type { TableColumn } from "@/lib/types";

function statusTone(status: string) {
  switch (status) {
    case "open":
      return "success" as const;
    case "paid":
    case "settled":
      return "info" as const;
    case "funding_required":
    case "previewed":
    case "settlement_previewed":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resultPeriods, setResultPeriods] = useState<ApiResultPeriod[]>([]);
  const [settlementBatches, setSettlementBatches] = useState<ApiSettlementBatch[]>([]);
  const [depositRequests, setDepositRequests] = useState<ApiDepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<ApiWithdrawalRequest[]>([]);
  const [reserveBalance, setReserveBalance] = useState("0");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [periodResponse, settlementResponse, depositResponse, withdrawalResponse, walletResponse] =
        await Promise.all([
          getAdminResultPeriods(),
          getSettlementBatches(),
          getAdminDepositRequests(),
          getAdminWithdrawalRequests(),
          getCompanyWallets(),
        ]);

      setResultPeriods(ensureResults(periodResponse));
      setSettlementBatches(ensureResults(settlementResponse));
      setDepositRequests(ensureResults(depositResponse));
      setWithdrawalRequests(ensureResults(withdrawalResponse));
      setReserveBalance(ensureResults(walletResponse)[0]?.balance ?? "0");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
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

  const currentPeriod = resultPeriods.find((period) => period.status === "open") ?? resultPeriods[0] ?? null;
  const pendingDeposits = depositRequests.filter(
    (request) => request.status === "pending" || request.status === "in_review",
  );
  const pendingWithdrawals = withdrawalRequests.filter(
    (request) => request.status === "pending" || request.status === "approved",
  );
  const approvedWaitingPayment = withdrawalRequests.filter((request) => request.status === "approved");
  const openPeriods = resultPeriods.filter((period) => period.status === "open");
  const liveSettlement = settlementBatches.find(
    (batch) => batch.status === "previewed" || batch.status === "funding_required",
  ) ?? settlementBatches[0] ?? null;

  const summaryCards = useMemo(
    () => [
      {
        title: "Current Period",
        value: currentPeriod?.code ?? "—",
        delta: currentPeriod ? statusLabel(currentPeriod.status) : "No open period",
        tone: currentPeriod?.status === "open" ? ("positive" as const) : ("neutral" as const),
        detail: currentPeriod
          ? `Closes ${formatDateOnly(currentPeriod.result_date)} ${formatTimeOnly(currentPeriod.default_close_time)}`
          : "Create a result period to begin.",
      },
      {
        title: "Open Result Periods",
        value: String(openPeriods.length),
        delta: "Live",
        tone: openPeriods.length > 0 ? ("positive" as const) : ("neutral" as const),
        detail: "Result periods currently accepting operations.",
      },
      {
        title: "Pending Deposits",
        value: String(pendingDeposits.length),
        delta: formatMmkAmount(
          pendingDeposits.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: pendingDeposits.length > 0 ? ("warning" as const) : ("neutral" as const),
        detail: "Deposit requests waiting for review.",
      },
      {
        title: "Pending Withdrawals",
        value: String(pendingWithdrawals.length),
        delta: formatMmkAmount(
          pendingWithdrawals.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: pendingWithdrawals.length > 0 ? ("warning" as const) : ("neutral" as const),
        detail: "Withdrawal requests waiting for approval or payment.",
      },
      {
        title: "Settlement Batches",
        value: String(settlementBatches.length),
        delta: liveSettlement ? statusLabel(liveSettlement.status) : "None",
        tone: liveSettlement ? ("warning" as const) : ("neutral" as const),
        detail: liveSettlement
          ? `${liveSettlement.result_period_code ?? liveSettlement.result_period} / ${formatMmkAmount(liveSettlement.total_settlement)}`
          : "Settlement previews appear after result entry.",
      },
      {
        title: "Company Reserve",
        value: formatMmkAmount(reserveBalance),
        delta: "Reserve",
        tone: Number(reserveBalance) > 0 ? ("positive" as const) : ("neutral" as const),
        detail: "Current company reserve wallet balance.",
      },
    ],
    [currentPeriod, liveSettlement, openPeriods.length, pendingDeposits, pendingWithdrawals, reserveBalance, settlementBatches.length],
  );

  const resultColumns: TableColumn<ApiResultPeriod>[] = [
    {
      key: "period",
      header: "Result Period",
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--color-foreground)]">{row.code}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{row.name}</p>
        </div>
      ),
    },
    {
      key: "resultDate",
      header: "Result Date",
      className: "whitespace-nowrap",
      render: (row) => formatDateOnly(row.result_date),
    },
    {
      key: "closeAt",
      header: "Closes",
      className: "whitespace-nowrap",
      render: (row) => formatTimeOnly(row.default_close_time),
    },
    {
      key: "resultNumber",
      header: "Result Number",
      className: "whitespace-nowrap",
      render: (row) => row.result_number ?? "—",
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
  ];

  const settlementColumns: TableColumn<ApiSettlementBatch>[] = [
    {
      key: "batch",
      header: "Batch",
      className: "whitespace-nowrap",
      render: (row) => `SET-${row.result_period_code ?? row.result_period}-${String(row.id).padStart(3, "0")}`,
    },
    {
      key: "resultPeriod",
      header: "Result Period",
      className: "whitespace-nowrap",
      render: (row) => row.result_period_code ?? row.result_period,
    },
    {
      key: "resultNumber",
      header: "Result",
      className: "whitespace-nowrap",
      render: (row) => row.result_number,
    },
    {
      key: "totalCollected",
      header: "Total Collected",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_collected),
    },
    {
      key: "totalSettlement",
      header: "Total Settlement",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_settlement),
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Operations Dashboard
          </h1>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <article className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                Priority Alerts
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Immediate actions and current backend status.
              </p>
            </div>
            <StatusBadge status="success">Live</StatusBadge>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {approvedWaitingPayment.length} withdrawals approved and waiting to be marked as paid
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Withdrawal Requests</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {pendingDeposits.length} deposit requests pending review
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Deposit Requests</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {currentPeriod
                  ? `${currentPeriod.code} closes at ${formatTimeOnly(currentPeriod.default_close_time)}`
                  : "No open result period available"}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Result Periods</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                Quick Actions
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Common admin actions.
              </p>
            </div>
            <SparkIcon className="h-4 w-4 text-[var(--color-primary)]" />
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <ActionButton className="h-10 justify-start px-3.5 text-sm" onClick={() => router.push("/result-periods?action=create")}>
              Create Result Period
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-10 justify-start px-3.5 text-sm"
              onClick={() => router.push("/ledgers?action=create")}
            >
              Create Ledger
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-10 justify-start px-3.5 text-sm"
              onClick={() => router.push("/result-entry")}
            >
              Enter Result
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-10 justify-start px-3.5 text-sm"
              onClick={() => router.push("/settlement-preview")}
            >
              View Settlement
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-10 justify-start px-3.5 text-sm sm:col-span-2"
              onClick={() => router.push("/company-reserve?action=add-reserve")}
            >
              Add Reserve
            </ActionButton>
          </div>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((metric) => (
          <StatCard key={metric.title} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
        <DataTable
          title="Result Periods"
          description="Live result periods from the backend."
          rows={resultPeriods.slice(0, 6)}
          columns={[
            ...resultColumns,
            {
              key: "actions",
              header: "",
              className: "w-28 whitespace-nowrap",
              render: () => (
                <ActionButton
                  variant="ghost"
                  className="px-0 text-[var(--color-primary)] hover:bg-transparent"
                  onClick={() => router.push("/result-periods")}
                >
                  Open
                  <ChevronRightIcon className="h-4 w-4" />
                </ActionButton>
              ),
            },
          ]}
          actions={<ActionButton variant="secondary" onClick={() => router.push("/result-periods")}>View All</ActionButton>}
          emptyState={
            loading ? (
              <EmptyState title="Loading result periods" description="Fetching result periods from the backend." />
            ) : (
              <EmptyState
                title="No result periods"
                description="Create a result period to begin."
                action={
                  <Link href="/result-periods?action=create">
                    <ActionButton>Create Result Period</ActionButton>
                  </Link>
                }
              />
            )
          }
        />

        <DataTable
          title="Settlement Preview"
          description="Latest settlement preview generated after result entry."
          rows={settlementBatches.slice(0, 6)}
          columns={[
            ...settlementColumns,
            {
              key: "actions",
              header: "",
              className: "w-28 whitespace-nowrap",
              render: () => (
                <ActionButton
                  variant="ghost"
                  className="px-0 text-[var(--color-primary)] hover:bg-transparent"
                  onClick={() => router.push("/settlement-preview")}
                >
                  View
                </ActionButton>
              ),
            },
          ]}
          actions={<ActionButton onClick={() => router.push("/settlement-preview")}>View Settlement</ActionButton>}
          emptyState={
            loading ? (
              <EmptyState title="Loading settlement previews" description="Fetching settlement batches from the backend." />
            ) : (
              <EmptyState
                title="No settlement previews"
                description="Settlement previews appear after result entry."
              />
            )
          }
        />
      </section>
    </div>
  );
}
