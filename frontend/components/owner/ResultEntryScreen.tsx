"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { DropdownFilter, type DropdownOption } from "@/components/ui/DropdownFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  closeResultPeriod,
  enterResult,
  getAdminLedgers,
  getAdminResultPeriods,
  type ApiEnterResultResponse,
  type ApiLedger,
  type ApiResultPeriod,
} from "@/lib/api/ledgers";
import { getSettlementBatch, type ApiSettlementBatch } from "@/lib/api/settlements";
import { ensureResults } from "@/lib/api/types";
import { formatDateOnly, formatMmkAmount, formatTimeOnly } from "@/lib/format";
import type { TableColumn } from "@/lib/types";

type PreviewState = {
  summary: ApiEnterResultResponse;
  batch: ApiSettlementBatch | null;
};

function statusTone(status: string) {
  switch (status) {
    case "open":
      return "success" as const;
    case "closed":
      return "neutral" as const;
    case "previewed":
    case "settlement_previewed":
      return "warning" as const;
    case "paid":
    case "settled":
      return "success" as const;
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

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="block text-sm font-medium text-[var(--color-foreground)]">
      {children}
    </span>
  );
}

const cardClassName =
  "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_10px_32px_rgba(15,23,42,0.05)]";

export function ResultEntryScreen() {
  const [periods, setPeriods] = useState<ApiResultPeriod[]>([]);
  const [ledgers, setLedgers] = useState<ApiLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resultDigits, setResultDigits] = useState(["", "", ""]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [operationNote, setOperationNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [periodResponse, ledgerResponse] = await Promise.all([
        getAdminResultPeriods(),
        getAdminLedgers(),
      ]);

      const nextPeriods = ensureResults(periodResponse).filter(
        (period) => period.status === "open" && !period.result_number,
      );
      const nextLedgers = ensureResults(ledgerResponse);

      setPeriods(nextPeriods);
      setLedgers(nextLedgers);
      setSelectedPeriodId((current) => current || (nextPeriods[0] ? String(nextPeriods[0].id) : ""));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load result entry data.");
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

  const resultPeriodOptions = useMemo<DropdownOption[]>(() => {
    return periods.map((period) => ({
      label: `${period.code} — ${statusLabel(period.status)} — closes ${formatTimeOnly(period.default_close_time)}`,
      value: String(period.id),
    }));
  }, [periods]);

  const selectedPeriod = periods.find((period) => String(period.id) === selectedPeriodId) ?? null;
  const activeLedger = useMemo(() => {
    if (!selectedPeriod) return null;
    return (
      ledgers.find(
        (ledger) => ledger.result_period === selectedPeriod.id && ledger.status === "open",
      ) ?? null
    );
  }, [ledgers, selectedPeriod]);

  const resultNumber = resultDigits.join("");
  const isResultComplete = resultDigits.every((digit) => digit.length === 1);

  const matchedColumns: TableColumn<ApiSettlementBatch["items"][number]>[] = [
    {
      key: "user",
      header: "User",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.user_name ?? `User #${row.user}`}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      className: "whitespace-nowrap",
      render: (row) => row.user_phone ?? "—",
    },
    {
      key: "matchedNumber",
      header: "Matched Number",
      className: "whitespace-nowrap text-center",
      render: (row) => row.number_code,
    },
    {
      key: "matchedAmount",
      header: "Matched Amount",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_matched_amount),
    },
    {
      key: "settlementRate",
      header: "Settlement Rate",
      className: "whitespace-nowrap text-center",
      render: (row) => Number(row.settlement_rate).toLocaleString("en-US"),
    },
    {
      key: "settlementAmount",
      header: "Settlement Amount",
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.settlement_amount),
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => <StatusBadge status={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>,
    },
  ];

  function handleDigitChange(index: number, value: string) {
    const nextValue = value.replace(/\D/g, "").slice(-1);

    setResultDigits((current) => {
      const next = [...current];
      next[index] = nextValue;
      return next;
    });

    setOperationNote("");

    if (nextValue && index < 2) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && resultDigits[index] === "" && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  }

  async function handleClosePeriod() {
    if (!selectedPeriod) return;

    setSubmitting(true);
    setError("");
    try {
      await closeResultPeriod(selectedPeriod.id);
      setOperationNote(`Result period ${selectedPeriod.code} was closed.`);
      setPreviewState(null);
      setResultDigits(["", "", ""]);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to close result period.");
    } finally {
      setSubmitting(false);
      setCloseConfirmOpen(false);
    }
  }

  async function handleEnterResult() {
    if (!selectedPeriod || !isResultComplete) return;

    setSubmitting(true);
    setError("");
    try {
      const summary = await enterResult(selectedPeriod.id, resultNumber);
      const batch = await getSettlementBatch(summary.settlement_batch_id).catch(() => null);
      setPreviewState({ summary, batch });
      setOperationNote(summary.detail);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to enter result.");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Result Entry
            </h1>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-[0_10px_30px_rgba(120,53,15,0.05)]">
          <p className="text-sm font-medium leading-6 text-amber-950">
            Entering a result will close the result period and create a settlement preview. Please verify carefully before confirming.
          </p>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${cardClassName} p-5 text-sm text-[var(--color-muted-foreground)]`}>
            Loading result entry data...
          </div>
        ) : periods.length === 0 ? (
          <EmptyState
            title="No open result periods available"
            description="Create or reopen a result period before entering a result."
            action={
              <Link href="/result-periods?action=create">
                <ActionButton>Create Result Period</ActionButton>
              </Link>
            }
          />
        ) : (
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
                <StatusBadge status={selectedPeriod ? statusTone(selectedPeriod.status) : "neutral"}>
                  {selectedPeriod ? statusLabel(selectedPeriod.status) : "Unavailable"}
                </StatusBadge>
              </div>

              <div className="mt-5 space-y-5">
                <div className="space-y-2">
                  <FieldLabel>Result Period</FieldLabel>
                  <DropdownFilter
                    label="Result Period"
                    options={resultPeriodOptions}
                    selectedValue={selectedPeriodId}
                    onChange={(value) => {
                      setSelectedPeriodId(value);
                      setPreviewState(null);
                      setOperationNote("");
                      setResultDigits(["", "", ""]);
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
                        className="h-14 w-16 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-center text-2xl font-semibold text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                        aria-label={`Result digit ${index + 1}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                    Enter exactly 3 digits, e.g. 124.
                  </p>
                </div>

                {operationNote ? (
                  <div className="rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3">
                    <p className="text-sm text-[var(--badge-success-fg)]">{operationNote}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <ActionButton variant="secondary" onClick={() => setCloseConfirmOpen(true)} disabled={submitting}>
                    Close Period
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    onClick={() => setConfirmOpen(true)}
                    disabled={!isResultComplete || submitting}
                  >
                    Preview Settlement
                  </ActionButton>
                  <ActionButton onClick={() => setConfirmOpen(true)} disabled={!isResultComplete || submitting}>
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
                  <span className="text-sm text-[var(--color-muted-foreground)]">Period Code</span>
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    {selectedPeriod?.code ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                  <span className="text-sm text-[var(--color-muted-foreground)]">Result Date</span>
                  <span className="text-sm font-medium text-[var(--color-foreground)]">
                    {formatDateOnly(selectedPeriod?.result_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                  <span className="text-sm text-[var(--color-muted-foreground)]">Close Time</span>
                  <span className="text-sm font-medium text-[var(--color-foreground)]">
                    {formatTimeOnly(selectedPeriod?.default_close_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                  <span className="text-sm text-[var(--color-muted-foreground)]">Status</span>
                  <StatusBadge status={selectedPeriod ? statusTone(selectedPeriod.status) : "neutral"}>
                    {selectedPeriod ? statusLabel(selectedPeriod.status) : "Unavailable"}
                  </StatusBadge>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                  <span className="text-sm text-[var(--color-muted-foreground)]">Total Collected</span>
                  <span className="whitespace-nowrap text-sm font-medium text-[var(--color-foreground)]">
                    {previewState ? formatMmkAmount(previewState.summary.total_collected) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[var(--color-muted-foreground)]">Active Ledger</span>
                  <span className="text-sm font-medium text-[var(--color-foreground)]">
                    {activeLedger?.name ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {previewState ? (
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                Settlement Preview
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Preview values returned by the backend after result entry.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-5">
              {[
                ["Total Collected", formatMmkAmount(previewState.summary.total_collected)],
                ["Total Settlement", formatMmkAmount(previewState.summary.total_settlement)],
                ["Company Reserve Required", formatMmkAmount(previewState.summary.reserve_required)],
                ["Final Profit/Loss", formatMmkAmount(previewState.summary.profit_loss)],
              ].map(([label, value]) => (
                <div key={label} className={`${cardClassName} px-5 py-4`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                    {label}
                  </p>
                  <p className="mt-2 whitespace-nowrap text-lg font-semibold text-[var(--color-foreground)]">
                    {value}
                  </p>
                </div>
              ))}
              <div className={`${cardClassName} px-5 py-4`}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                  Status
                </p>
                <div className="mt-2">
                  <StatusBadge status={statusTone(previewState.summary.status)}>
                    {statusLabel(previewState.summary.status)}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <DataTable
              title="Matched Users"
              description="Matched users returned by the settlement preview."
              rows={previewState.batch?.items ?? []}
              columns={matchedColumns}
              tableClassName="min-w-[980px]"
              emptyState={
                <EmptyState
                  title="No matched users"
                  description="The backend returned no matched users for this settlement preview."
                />
              }
            />
          </section>
        ) : null}
      </div>

      <ConfirmModal
        open={closeConfirmOpen}
        title="Confirm Period Closure"
        description={`You are about to close result period ${selectedPeriod?.code ?? ""}. This will prevent further number submission for this period.`}
        confirmLabel="Confirm Close Period"
        cancelLabel="Cancel"
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={handleClosePeriod}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Confirm Result Entry"
        description={`You are about to enter result number ${resultNumber} for ${selectedPeriod?.code ?? ""}. This will close the period and create a settlement preview.`}
        confirmLabel="Confirm and Preview Settlement"
        cancelLabel="Cancel"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleEnterResult}
      />
    </>
  );
}
