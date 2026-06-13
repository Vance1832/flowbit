"use client";

import Link from "next/link";
import { useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatMmk,
  useUserApp,
  type UserResult,
} from "@/components/providers/UserAppProvider";
import { UserPageHeader } from "@/components/user/UserPrimitives";
import type { TableColumn } from "@/lib/types";

export function UserResultsScreen() {
  const { loading, error: providerError, currentPeriod, latestVisibleResult, pastResults } =
    useUserApp();
  const [selectedResult, setSelectedResult] = useState<UserResult | null>(null);

  const columns: TableColumn<UserResult>[] = [
    {
      key: "period",
      header: "Period",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.period}</span>,
    },
    {
      key: "resultDate",
      header: "Result Date",
      className: "whitespace-nowrap",
      render: (row) => row.resultDate,
    },
    {
      key: "resultNumber",
      header: "Result Number",
      className: "whitespace-nowrap",
      render: (row) => row.resultNumber,
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => <StatusBadge status="success">{row.status}</StatusBadge>,
    },
    {
      key: "myReceipt",
      header: "My Receipt",
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
      header: "Actions",
      className: "whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => setSelectedResult(row)}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <UserPageHeader title="Results" />

        {providerError ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {providerError}
          </div>
        ) : null}

        {currentPeriod ? (
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Current Period
              </p>
              <div className="mt-3 flex items-center gap-3">
                <h2 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  {currentPeriod.code}
                </h2>
                <StatusBadge status="success">{currentPeriod.status}</StatusBadge>
              </div>
              <p className="mt-4 text-[22px] font-semibold tracking-[0.22em] text-[var(--color-primary)]">
                {currentPeriod.pendingMask}
              </p>
            </div>
            <div className="text-right text-sm text-[var(--color-muted-foreground)]">
              <p>Result Date: {currentPeriod.resultDate}</p>
              <p className="mt-2">Closes at: {currentPeriod.closesAt}</p>
              <div className="mt-4">
                <Link href="/user/submit-numbers">
                  <ActionButton className="h-10 rounded-xl px-4">Submit Numbers</ActionButton>
                </Link>
              </div>
            </div>
          </div>
        </section>
        ) : latestVisibleResult ? (
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Latest Result
              </p>
              <div className="mt-3 flex items-center gap-3">
                <h2 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  {latestVisibleResult.code}
                </h2>
                <StatusBadge status="info">Published</StatusBadge>
              </div>
              <p className="mt-4 text-[22px] font-semibold tracking-[0.16em] text-[var(--color-primary)]">
                {latestVisibleResult.resultNumber}
              </p>
            </div>
            <div className="text-right text-sm text-[var(--color-muted-foreground)]">
              <p>Result Date: {latestVisibleResult.resultDate}</p>
              <p className="mt-2">Visible until: {latestVisibleResult.visibleUntil}</p>
            </div>
          </div>
        </section>
        ) : loading ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            Loading current result period...
          </div>
        ) : (
          <EmptyState
            title="No open result period right now"
            description="Past settled results remain available below."
          />
        )}

        <DataTable
          title="Past Results"
          description="Settled result periods and result numbers."
          columns={columns}
          rows={pastResults}
        />
      </div>

      <DetailDrawer
        open={selectedResult !== null}
        title={selectedResult ? `Result ${selectedResult.period}` : "Result Detail"}
        onClose={() => setSelectedResult(null)}
      >
        {selectedResult ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Period", selectedResult.period],
                ["Result Number", selectedResult.resultNumber],
                ["Result Date", selectedResult.resultDate],
                ["Status", selectedResult.status],
                ["My Receipt Match Status", selectedResult.myReceiptStatus],
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
                My Receipt Match Status
              </p>
              {selectedResult.myReceiptStatus === "Matched" ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {[
                    ["Receipt No", selectedResult.matchedReceiptNo ?? "—"],
                    ["Matched Number", selectedResult.matchedNumber ?? "—"],
                    [
                      "Matched Amount",
                      selectedResult.matchedAmount ? formatMmk(selectedResult.matchedAmount) : "—",
                    ],
                    [
                      "Settlement Amount",
                      selectedResult.settlementAmount
                        ? formatMmk(selectedResult.settlementAmount)
                        : "—",
                    ],
                    ["Wallet Credit Status", selectedResult.walletCreditStatus ?? "—"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3.5"
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
                  No matching receipt for this result.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
