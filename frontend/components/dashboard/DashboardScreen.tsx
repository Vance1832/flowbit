"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronRightIcon, SparkIcon } from "@/components/icons";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { AnalyticsSection } from "@/components/owner/AnalyticsSection";
import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero } from "@/components/ui/PageHero";
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
  const t = useTranslations();
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
      setError(loadError instanceof Error ? loadError.message : t("ownerDash.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // Load once on mount; loadData only re-reads t for an error fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        title: t("ownerDash.cardCurrentPeriod"),
        value: currentPeriod?.code ?? "—",
        delta: currentPeriod ? statusLabel(currentPeriod.status) : t("ownerDash.noOpenPeriod"),
        tone: currentPeriod?.status === "open" ? ("positive" as const) : ("neutral" as const),
        detail: currentPeriod
          ? t("ownerDash.closesDateTime", {
              date: formatDateOnly(currentPeriod.result_date),
              time: formatTimeOnly(currentPeriod.default_close_time),
            })
          : t("ownerDash.createPeriodToBegin"),
      },
      {
        title: t("ownerDash.cardOpenPeriods"),
        value: String(openPeriods.length),
        delta: t("ownerDash.live"),
        tone: openPeriods.length > 0 ? ("positive" as const) : ("neutral" as const),
        detail: t("ownerDash.openPeriodsDetail"),
      },
      {
        title: t("ownerDash.cardPendingDeposits"),
        value: String(pendingDeposits.length),
        delta: formatMmkAmount(
          pendingDeposits.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: pendingDeposits.length > 0 ? ("warning" as const) : ("neutral" as const),
        detail: t("ownerDash.pendingDepositsDetail"),
      },
      {
        title: t("ownerDash.cardPendingWithdrawals"),
        value: String(pendingWithdrawals.length),
        delta: formatMmkAmount(
          pendingWithdrawals.reduce((sum, item) => sum + Number(item.amount), 0),
        ),
        tone: pendingWithdrawals.length > 0 ? ("warning" as const) : ("neutral" as const),
        detail: t("ownerDash.pendingWithdrawalsDetail"),
      },
      {
        title: t("ownerDash.cardSettlementBatches"),
        value: String(settlementBatches.length),
        delta: liveSettlement ? statusLabel(liveSettlement.status) : t("ownerDash.none"),
        tone: liveSettlement ? ("warning" as const) : ("neutral" as const),
        detail: liveSettlement
          ? t("ownerDash.settlementDetail", {
              period: liveSettlement.result_period_code ?? liveSettlement.result_period,
              amount: formatMmkAmount(liveSettlement.total_settlement),
            })
          : t("ownerDash.settlementBatchesDetail"),
      },
      {
        title: t("ownerDash.cardCompanyReserve"),
        value: formatMmkAmount(reserveBalance),
        delta: t("ownerDash.reserve"),
        tone: Number(reserveBalance) > 0 ? ("positive" as const) : ("neutral" as const),
        detail: t("ownerDash.companyReserveDetail"),
      },
    ],
    [currentPeriod, liveSettlement, openPeriods.length, pendingDeposits, pendingWithdrawals, reserveBalance, settlementBatches.length, t],
  );

  const resultColumns: TableColumn<ApiResultPeriod>[] = [
    {
      key: "period",
      header: t("ownerDash.colResultPeriod"),
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--color-foreground)]">{row.code}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{row.name}</p>
        </div>
      ),
    },
    {
      key: "resultDate",
      header: t("ownerDash.colResultDate"),
      className: "whitespace-nowrap",
      render: (row) => formatDateOnly(row.result_date),
    },
    {
      key: "closeAt",
      header: t("ownerDash.colCloses"),
      className: "whitespace-nowrap",
      render: (row) => formatTimeOnly(row.default_close_time),
    },
    {
      key: "resultNumber",
      header: t("ownerDash.colResultNumber"),
      className: "whitespace-nowrap",
      render: (row) => row.result_number ?? "—",
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
  ];

  const settlementColumns: TableColumn<ApiSettlementBatch>[] = [
    {
      key: "batch",
      header: t("ownerDash.colBatch"),
      className: "whitespace-nowrap",
      render: (row) => `SET-${row.result_period_code ?? row.result_period}-${String(row.id).padStart(3, "0")}`,
    },
    {
      key: "resultPeriod",
      header: t("ownerDash.colResultPeriod"),
      className: "whitespace-nowrap",
      render: (row) => row.result_period_code ?? row.result_period,
    },
    {
      key: "resultNumber",
      header: t("ownerDash.colResult"),
      className: "whitespace-nowrap",
      render: (row) => row.result_number,
    },
    {
      key: "totalCollected",
      header: t("ownerDash.colTotalCollected"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_collected),
    },
    {
      key: "totalSettlement",
      header: t("ownerDash.colTotalSettlement"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_settlement),
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHero>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">{t("ownerDash.operationsDashboard")}</p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
              {t("ownerDash.companyReserve")}
            </p>
            <p className="mt-1 text-[32px] font-semibold tracking-tight">
              {formatMmkAmount(reserveBalance)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
              {t("ownerDash.needsAttention")}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {pendingDeposits.length + pendingWithdrawals.length}
            </p>
            <p className="mt-0.5 text-xs text-white/70">{t("ownerDash.pendingRequests")}</p>
          </div>
        </div>
      </PageHero>

      {error ? (
        <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
          {error}
        </div>
      ) : null}

      <AnalyticsSection />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                {t("ownerDash.priorityAlerts")}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {t("ownerDash.priorityAlertsDesc")}
              </p>
            </div>
            <StatusBadge status="success">{t("ownerDash.live")}</StatusBadge>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {t("ownerDash.alertWithdrawals", { count: approvedWaitingPayment.length })}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t("consoleNav.withdrawalRequests")}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {t("ownerDash.alertDeposits", { count: pendingDeposits.length })}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t("consoleNav.depositRequests")}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {currentPeriod
                  ? t("ownerDash.periodClosesAt", {
                      code: currentPeriod.code,
                      time: formatTimeOnly(currentPeriod.default_close_time),
                    })
                  : t("ownerDash.noOpenPeriodAvailable")}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t("consoleNav.resultPeriods")}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                {t("ownerDash.quickActions")}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {t("ownerDash.quickActionsDesc")}
              </p>
            </div>
            <SparkIcon className="h-4 w-4 text-[var(--color-primary)]" />
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <ActionButton className="h-10 justify-start px-3.5 text-sm" onClick={() => router.push("/result-periods?action=create")}>
              {t("ownerDash.createResultPeriod")}
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-10 justify-start px-3.5 text-sm"
              onClick={() => router.push("/ledgers?action=create")}
            >
              {t("ownerDash.createLedger")}
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-10 justify-start px-3.5 text-sm"
              onClick={() => router.push("/result-entry")}
            >
              {t("ownerDash.enterResult")}
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-10 justify-start px-3.5 text-sm"
              onClick={() => router.push("/settlement-preview")}
            >
              {t("ownerDash.viewSettlement")}
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-10 justify-start px-3.5 text-sm sm:col-span-2"
              onClick={() => router.push("/company-reserve?action=add-reserve")}
            >
              {t("ownerDash.addReserve")}
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
          title={t("ownerDash.resultPeriodsTitle")}
          description={t("ownerDash.resultPeriodsDesc")}
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
                  {t("ownerDash.open")}
                  <ChevronRightIcon className="h-4 w-4" />
                </ActionButton>
              ),
            },
          ]}
          actions={<ActionButton variant="secondary" onClick={() => router.push("/result-periods")}>{t("ownerDash.viewAll")}</ActionButton>}
          emptyState={
            loading ? (
              <EmptyState title={t("ownerDash.loadingPeriods")} description={t("ownerDash.loadingPeriodsDesc")} />
            ) : (
              <EmptyState
                title={t("ownerDash.noPeriods")}
                description={t("ownerDash.createPeriodToBegin")}
                action={
                  <Link href="/result-periods?action=create">
                    <ActionButton>{t("ownerDash.createResultPeriod")}</ActionButton>
                  </Link>
                }
              />
            )
          }
        />

        <DataTable
          title={t("ownerDash.settlementPreviewTitle")}
          description={t("ownerDash.settlementPreviewDesc")}
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
                  {t("common.view")}
                </ActionButton>
              ),
            },
          ]}
          actions={<ActionButton onClick={() => router.push("/settlement-preview")}>{t("ownerDash.viewSettlement")}</ActionButton>}
          emptyState={
            loading ? (
              <EmptyState title={t("ownerDash.loadingSettlements")} description={t("ownerDash.loadingSettlementsDesc")} />
            ) : (
              <EmptyState
                title={t("ownerDash.noSettlements")}
                description={t("ownerDash.settlementBatchesDetail")}
              />
            )
          }
        />
      </section>
    </div>
  );
}
