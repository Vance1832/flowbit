"use client";

import type { KeyboardEvent } from "react";
import { useMemo, useRef, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import {
  DropdownFilter,
  type DropdownOption,
} from "@/components/ui/DropdownFilter";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TableColumn } from "@/lib/types";

type ResultEntryStatus = "Open" | "Closed";

type ResultPeriodInfo = {
  code: string;
  resultDate: string;
  closeTime: string;
  status: ResultEntryStatus;
  totalCollected: string;
  activeLedger: string;
};

type PreviewSummary = {
  totalCollected: string;
  totalSettlement: string;
  reserveRequired: string;
  profitLoss: string;
  status: "Funding Required";
};

type MatchedUserRow = {
  user: string;
  phone: string;
  matchedNumber: string;
  matchedAmount: string;
  settlementRate: string;
  settlementAmount: string;
  status: "Previewed";
};

const resultPeriodOptions: DropdownOption[] = [
  { label: "TEST02 — Open — closes 15:00", value: "TEST02" },
];

const periodInfoMap: Record<string, ResultPeriodInfo> = {
  TEST02: {
    code: "TEST02",
    resultDate: "2026-06-30",
    closeTime: "15:00",
    status: "Open",
    totalCollected: "MMK 6,000",
    activeLedger: "Test Ledger 02",
  },
  JUNE01: {
    code: "JUNE01",
    resultDate: "2026-06-01",
    closeTime: "15:00",
    status: "Closed",
    totalCollected: "MMK 8,000",
    activeLedger: "Main Ledger",
  },
  MAY16: {
    code: "MAY16",
    resultDate: "2026-05-16",
    closeTime: "15:00",
    status: "Closed",
    totalCollected: "MMK 4,500",
    activeLedger: "Main Ledger",
  },
};

const previewSummary: PreviewSummary = {
  totalCollected: "MMK 6,000",
  totalSettlement: "MMK 2,100,000",
  reserveRequired: "MMK 2,094,000",
  profitLoss: "-MMK 2,094,000",
  status: "Funding Required",
};

const matchedUsers: MatchedUserRow[] = [
  {
    user: "Flow Test User",
    phone: "+959777777777",
    matchedNumber: "124",
    matchedAmount: "MMK 3,000",
    settlementRate: "700",
    settlementAmount: "MMK 2,100,000",
    status: "Previewed",
  },
];

const summaryCards = [
  { label: "Total Collected", key: "totalCollected" as const },
  { label: "Total Settlement", key: "totalSettlement" as const },
  { label: "Company Reserve Required", key: "reserveRequired" as const },
  { label: "Final Profit/Loss", key: "profitLoss" as const },
];

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="block text-sm font-medium text-[var(--color-foreground)]">
      {children}
    </span>
  );
}

const cardClassName =
  "rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_10px_32px_rgba(15,23,42,0.05)]";

export function ResultEntryScreen() {
  const [selectedPeriodCode, setSelectedPeriodCode] = useState("TEST02");
  const [periodStatuses, setPeriodStatuses] = useState<Record<string, ResultEntryStatus>>({
    TEST02: "Open",
    JUNE01: "Closed",
    MAY16: "Closed",
  });
  const [resultDigits, setResultDigits] = useState(["", "", ""]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
  const [operationNote, setOperationNote] = useState<string | null>(null);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  const periodInfo = useMemo(() => {
    const base = periodInfoMap[selectedPeriodCode];

    return {
      ...base,
      status: periodStatuses[selectedPeriodCode] ?? base.status,
    };
  }, [periodStatuses, selectedPeriodCode]);

  const resultNumber = resultDigits.join("");
  const isResultComplete = resultDigits.every((digit) => digit.length === 1);

  const matchedRows = useMemo(() => {
    return matchedUsers.map((row) => ({
      ...row,
      matchedNumber: resultNumber,
    }));
  }, [resultNumber]);

  const matchedColumns: TableColumn<MatchedUserRow>[] = [
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
      key: "matchedNumber",
      header: "Matched Number",
      className: "whitespace-nowrap text-center",
      render: (row) => row.matchedNumber,
    },
    {
      key: "matchedAmount",
      header: "Matched Amount",
      className: "whitespace-nowrap",
      render: (row) => row.matchedAmount,
    },
    {
      key: "settlementRate",
      header: "Settlement Rate",
      className: "whitespace-nowrap text-center",
      render: (row) => row.settlementRate,
    },
    {
      key: "settlementAmount",
      header: "Settlement Amount",
      className: "whitespace-nowrap",
      render: (row) => row.settlementAmount,
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => <StatusBadge status="warning">{row.status}</StatusBadge>,
    },
  ];

  function handleDigitChange(index: number, value: string) {
    const nextValue = value.replace(/\D/g, "").slice(-1);

    setResultDigits((current) => {
      const next = [...current];
      next[index] = nextValue;
      return next;
    });

    if (nextValue && index < 2) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && resultDigits[index] === "" && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  }

  function handleClosePeriod() {
    setPeriodStatuses((current) => ({
      ...current,
      [selectedPeriodCode]: "Closed",
    }));
    setOperationNote("Result period marked closed in local preview state.");
  }

  function handlePreviewSettlement() {
    setPreviewVisible(true);
    setOperationNote("Settlement preview generated from local mock data.");
  }

  function handleConfirmResultEntry() {
    setPeriodStatuses((current) => ({
      ...current,
      [selectedPeriodCode]: "Closed",
    }));
    setPreviewVisible(true);
    setConfirmOpen(false);
    setOperationNote("Result entry saved locally and settlement preview created.");
  }

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Result Entry
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Enter result number, close the period, and preview settlement calculations.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-[0_10px_30px_rgba(120,53,15,0.05)]">
          <p className="text-sm font-medium leading-6 text-amber-950">
            Entering a result will close the result period and create a settlement
            preview. Please verify carefully before confirming.
          </p>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <div className={`${cardClassName} p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                  Enter Result
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Review the period and enter the final 3-digit result carefully.
                </p>
              </div>
              <StatusBadge
                status={periodInfo.status === "Open" ? "success" : "neutral"}
              >
                {periodInfo.status}
              </StatusBadge>
            </div>

            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <FieldLabel>Result Period</FieldLabel>
                <DropdownFilter
                  label="Result Period"
                  options={resultPeriodOptions}
                  selectedValue={selectedPeriodCode}
                  onChange={(value) => {
                    setSelectedPeriodCode(value);
                    setPreviewVisible(false);
                    setOperationNote(null);
                  }}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>Result Number</FieldLabel>
                <div className="flex gap-3">
                  {resultDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        digitRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleDigitChange(index, event.target.value)}
                      onKeyDown={(event) => handleDigitKeyDown(index, event)}
                      className="h-14 w-16 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-center text-2xl font-semibold text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:bg-white focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                      aria-label={`Result digit ${index + 1}`}
                    />
                  ))}
                </div>
                <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                  Enter exactly 3 digits, e.g. 124.
                </p>
              </div>

              {operationNote ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {operationNote}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <ActionButton
                  variant="secondary"
                  onClick={() => setCloseConfirmOpen(true)}
                >
                  Close Period
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={handlePreviewSettlement}
                  disabled={!isResultComplete}
                >
                  Preview Settlement
                </ActionButton>
                <ActionButton
                  onClick={() => setConfirmOpen(true)}
                  disabled={!isResultComplete}
                >
                  Enter Result
                </ActionButton>
              </div>
            </div>
          </div>

          <div className={`${cardClassName} p-5`}>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Current Period Info
            </h2>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  Period Code
                </span>
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  {periodInfo.code}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  Result Date
                </span>
                <span className="text-sm font-medium text-[var(--color-foreground)]">
                  {periodInfo.resultDate}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  Close Time
                </span>
                <span className="text-sm font-medium text-[var(--color-foreground)]">
                  {periodInfo.closeTime}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                <span className="text-sm text-[var(--color-muted-foreground)]">Status</span>
                <StatusBadge
                  status={periodInfo.status === "Open" ? "success" : "neutral"}
                >
                  {periodInfo.status}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  Total Collected
                </span>
                <span className="whitespace-nowrap text-sm font-medium text-[var(--color-foreground)]">
                  {periodInfo.totalCollected}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  Active Ledger
                </span>
                <span className="text-sm font-medium text-[var(--color-foreground)]">
                  {periodInfo.activeLedger}
                </span>
              </div>
            </div>
          </div>
        </section>

        {previewVisible ? (
          <section className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                  Settlement Preview
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Preview values generated from local mock state for owner/admin review.
                </p>
              </div>
              <ActionButton
                variant="secondary"
                onClick={() => setPreviewDrawerOpen(true)}
              >
                View Preview Details
              </ActionButton>
            </div>

            <div className="grid gap-4 xl:grid-cols-5">
              {summaryCards.map((card) => (
                <div key={card.key} className={`${cardClassName} px-5 py-4`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                    {card.label}
                  </p>
                  <p className="mt-2 whitespace-nowrap text-lg font-semibold text-[var(--color-foreground)]">
                    {previewSummary[card.key]}
                  </p>
                </div>
              ))}
              <div className={`${cardClassName} px-5 py-4`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Status
                </p>
                <div className="mt-2">
                  <StatusBadge status="danger">{previewSummary.status}</StatusBadge>
                </div>
              </div>
            </div>

            <DataTable
              title="Matched Users"
              description="Users matched against the entered result before final settlement processing."
              rows={matchedRows}
              columns={matchedColumns}
              tableClassName="min-w-[980px]"
            />
          </section>
        ) : null}
      </div>

      <ConfirmModal
        open={closeConfirmOpen}
        title="Confirm Period Closure"
        description={`You are about to close result period ${selectedPeriodCode}. This will prevent further number submission for this period.`}
        confirmLabel="Confirm Close Period"
        cancelLabel="Cancel"
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={() => {
          handleClosePeriod();
          setCloseConfirmOpen(false);
        }}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Confirm Result Entry"
        description={`You are about to enter result number ${resultNumber} for ${selectedPeriodCode}. This will close the period and create a settlement preview.`}
        confirmLabel="Confirm and Preview Settlement"
        cancelLabel="Cancel"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmResultEntry}
      />

      <DetailDrawer
        open={previewDrawerOpen}
        title="Settlement Preview Details"
        subtitle={`${selectedPeriodCode} / Result ${resultNumber}`}
        onClose={() => setPreviewDrawerOpen(false)}
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            Review the preview carefully before moving to final settlement approval
            and reserve handling.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Period
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                {selectedPeriodCode}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Result Number
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                {resultNumber}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Total Settlement
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                {previewSummary.totalSettlement}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                Company Reserve Required
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[var(--color-foreground)]">
                {previewSummary.reserveRequired}
              </p>
            </div>
          </div>

          <DataTable
            title="Matched Users"
            rows={matchedRows}
            columns={matchedColumns}
            tableClassName="min-w-[880px]"
          />
        </div>
      </DetailDrawer>
    </>
  );
}
