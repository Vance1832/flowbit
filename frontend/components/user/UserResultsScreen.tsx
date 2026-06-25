"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroPill, PageHero } from "@/components/ui/PageHero";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatMmk,
  useUserApp,
  type UserResult,
} from "@/components/providers/UserAppProvider";
import { UserPageHeader } from "@/components/user/UserPrimitives";

const heroPrimaryButton =
  "h-10 rounded-xl px-4 border-white bg-white text-[var(--color-primary)] hover:border-white hover:bg-white/90";
import type { TableColumn } from "@/lib/types";

export function UserResultsScreen() {
  const t = useTranslations();
  const { loading, error: providerError, currentPeriod, latestVisibleResult, pastResults } =
    useUserApp();
  const [selectedResult, setSelectedResult] = useState<UserResult | null>(null);

  const columns: TableColumn<UserResult>[] = [
    {
      key: "period",
      header: t("results.colPeriod"),
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.period}</span>,
    },
    {
      key: "resultDate",
      header: t("results.colResultDate"),
      className: "whitespace-nowrap",
      render: (row) => row.resultDate,
    },
    {
      key: "resultNumber",
      header: t("results.colResultNumber"),
      className: "whitespace-nowrap",
      render: (row) => row.resultNumber,
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => <StatusBadge status="success">{row.status}</StatusBadge>,
    },
    {
      key: "myReceipt",
      header: t("results.colMyReceipt"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge
          status={
            row.myReceiptStatus === "Matched"
              ? "success"
              : row.myReceiptStatus === "No Match"
                ? "warning"
                : "neutral"
          }
        >
          {row.myReceiptStatus}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: t("results.colActions"),
      className: "whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => setSelectedResult(row)}
        >
          {t("common.view")}
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <UserPageHeader title={t("results.title")} />

        {providerError ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {providerError}
          </div>
        ) : null}

        {currentPeriod ? (
        <PageHero>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">{t("results.currentPeriod")}</p>
              <div className="mt-3 flex items-center gap-3">
                <h2 className="text-[30px] font-semibold tracking-tight">{currentPeriod.code}</h2>
                <HeroPill>{currentPeriod.status}</HeroPill>
              </div>
              <p className="mt-4 text-[22px] font-semibold tracking-[0.22em] text-white">
                {currentPeriod.pendingMask}
              </p>
            </div>
            <div className="text-right text-sm text-white/80">
              <p>{t("dashboard.resultDate", { date: currentPeriod.resultDate })}</p>
              <p className="mt-2">{t("dashboard.closesAt", { time: currentPeriod.closesAt })}</p>
              <div className="mt-4">
                <Link href="/user/submit-numbers">
                  <ActionButton className={heroPrimaryButton}>{t("dashboard.submitNumbers")}</ActionButton>
                </Link>
              </div>
            </div>
          </div>
        </PageHero>
        ) : latestVisibleResult ? (
        <PageHero>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">{t("dashboard.latestResult")}</p>
              <div className="mt-3 flex items-center gap-3">
                <h2 className="text-[30px] font-semibold tracking-tight">{latestVisibleResult.code}</h2>
                <HeroPill>{t("dashboard.published")}</HeroPill>
              </div>
              <p className="mt-4 text-[22px] font-semibold tracking-[0.16em] text-white">
                {latestVisibleResult.resultNumber}
              </p>
            </div>
            <div className="text-right text-sm text-white/80">
              <p>{t("dashboard.resultDate", { date: latestVisibleResult.resultDate })}</p>
              <p className="mt-2">{t("dashboard.visibleUntil", { date: latestVisibleResult.visibleUntil })}</p>
            </div>
          </div>
        </PageHero>
        ) : loading ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            {t("dashboard.loadingPeriod")}
          </div>
        ) : (
          <EmptyState
            title={t("dashboard.noPeriodTitle")}
            description={t("results.noPeriodDesc")}
          />
        )}

        <DataTable
          title={t("results.pastResults")}
          description={t("results.pastResultsDesc")}
          columns={columns}
          rows={pastResults}
        />
      </div>

      <DetailDrawer
        open={selectedResult !== null}
        title={
          selectedResult
            ? t("results.detailTitle", { period: selectedResult.period })
            : t("results.resultDetail")
        }
        onClose={() => setSelectedResult(null)}
      >
        {selectedResult ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [t("results.colPeriod"), selectedResult.period],
                [t("results.colResultNumber"), selectedResult.resultNumber],
                [t("results.colResultDate"), selectedResult.resultDate],
                [t("common.status"), selectedResult.status],
                [t("results.myReceiptMatchStatus"), selectedResult.myReceiptStatus],
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

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {t("results.myReceiptMatchStatus")}
              </p>
              {selectedResult.myReceiptStatus === "Matched" ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {[
                    [t("results.receiptNo"), selectedResult.matchedReceiptNo ?? "—"],
                    [t("results.matchedNumber"), selectedResult.matchedNumber ?? "—"],
                    [
                      t("results.matchedAmount"),
                      selectedResult.matchedAmount ? formatMmk(selectedResult.matchedAmount) : "—",
                    ],
                    [
                      t("results.settlementAmount"),
                      selectedResult.settlementAmount
                        ? formatMmk(selectedResult.settlementAmount)
                        : "—",
                    ],
                    [t("results.walletCreditStatus"), selectedResult.walletCreditStatus ?? "—"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3.5"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                        {label}
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {t("results.noMatchingReceipt")}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
