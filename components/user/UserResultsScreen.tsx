"use client";

import { useMemo, useState } from "react";

import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  useUserApp,
  type UserResult,
} from "@/components/providers/UserAppProvider";
import { UserPageHeader } from "@/components/user/UserPrimitives";
import type { TableColumn } from "@/lib/types";

export function UserResultsScreen() {
  const { currentPeriod, pastResults, receipts } = useUserApp();
  const [selectedResult, setSelectedResult] = useState<UserResult | null>(null);

  const matchingReceipt = useMemo(() => {
    if (!selectedResult) return null;
    return receipts.find((receipt) => {
      if (receipt.period !== selectedResult.period) return false;
      return receipt.items.some((item) => {
        return (
          item.number === selectedResult.resultNumber ||
          item.generatedNumbers.includes(selectedResult.resultNumber)
        );
      });
    }) ?? null;
  }, [receipts, selectedResult]);

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
        <UserPageHeader
          title="Results"
          subtitle="Check current and past result numbers."
        />

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
            </div>
          </div>
        </section>

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
        subtitle="Review result detail and receipt match status."
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
                User receipt match status
              </p>
              {matchingReceipt ? (
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  Matching receipt found: {matchingReceipt.receiptNo} ({matchingReceipt.period})
                </p>
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
