"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useTranslations } from "@/components/providers/LocaleProvider";
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
  getOfficialResult,
  type ApiEnterResultResponse,
  type ApiLedger,
  type ApiOfficialResult,
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

// status key → message key; the badge label maps through this.
const STATUS_KEY: Record<string, string> = {
  open: "resultEntry.statusOpen",
  closed: "resultEntry.statusClosed",
  previewed: "resultEntry.statusPreviewed",
  settlement_previewed: "resultEntry.statusSettlementPreviewed",
  paid: "resultEntry.statusPaid",
  settled: "resultEntry.statusSettled",
};

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
  const t = useTranslations();

  const statusLabel = (status: string) =>
    STATUS_KEY[status]
      ? t(STATUS_KEY[status])
      : status
          .split("_")
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(" ");

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
  const [officialResult, setOfficialResult] = useState<ApiOfficialResult | null>(null);
  const [usingOfficial, setUsingOfficial] = useState(false);
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
      setError(loadError instanceof Error ? loadError.message : t("resultEntry.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Look up the official Thai 3D result for the selected period's draw date.
  useEffect(() => {
    if (!selectedPeriodId) return;
    let active = true;

    void getOfficialResult(Number(selectedPeriodId))
      .then((result) => {
        if (active) {
          setOfficialResult(result);
          setUsingOfficial(false);
        }
      })
      .catch(() => {
        if (active) setOfficialResult(null);
      });

    return () => {
      active = false;
    };
  }, [selectedPeriodId]);

  const resultPeriodOptions = useMemo<DropdownOption[]>(() => {
    return periods.map((period) => ({
      label: t("resultEntry.optionLabel", {
        code: period.code,
        status: statusLabel(period.status),
        time: formatTimeOnly(period.default_close_time),
      }),
      value: String(period.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periods, t]);

  const selectedPeriod = periods.find((period) => String(period.id) === selectedPeriodId) ?? null;
  const activeLedger = useMemo(() => {
    if (!selectedPeriod) return null;
    return (
      ledgers.find(
        (ledger) => ledger.result_period === selectedPeriod.id && ledger.status === "open",
      ) ?? null
    );
  }, [ledgers, selectedPeriod]);

  // Numbers are always 3 digits (3D). The official number to match against and
  // the input box count both follow from this.
  const numberLength = 3;
  const officialNumber =
    officialResult?.available === true ? officialResult.three_up : null;

  const resultNumber = resultDigits.slice(0, numberLength).join("");
  const isResultComplete =
    resultDigits.slice(0, numberLength).every((digit) => digit.length === 1);

  const matchedColumns: TableColumn<ApiSettlementBatch["items"][number]>[] = [
    {
      key: "user",
      header: t("resultEntry.colUser"),
      className: "whitespace-nowrap",
      render: (row) => (
        <span className="font-medium">
          {row.user_name ?? t("resultEntry.userFallback", { id: row.user })}
        </span>
      ),
    },
    {
      key: "phone",
      header: t("resultEntry.colPhone"),
      className: "whitespace-nowrap",
      render: (row) => row.user_phone ?? "—",
    },
    {
      key: "matchedNumber",
      header: t("resultEntry.colMatchedNumber"),
      className: "whitespace-nowrap text-center",
      render: (row) => row.number_code,
    },
    {
      key: "matchedAmount",
      header: t("resultEntry.colMatchedAmount"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.total_matched_amount),
    },
    {
      key: "settlementRate",
      header: t("resultEntry.colSettlementRate"),
      className: "whitespace-nowrap text-center",
      render: (row) => Number(row.settlement_rate).toLocaleString("en-US"),
    },
    {
      key: "settlementAmount",
      header: t("resultEntry.colSettlementAmount"),
      className: "whitespace-nowrap",
      render: (row) => formatMmkAmount(row.settlement_amount),
    },
    {
      key: "status",
      header: t("common.status"),
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
    // Any manual edit invalidates the "confirmed from official" provenance.
    setUsingOfficial(false);

    if (nextValue && index < numberLength - 1) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function applyOfficialResult() {
    if (!officialNumber) return;
    setResultDigits(officialNumber.split(""));
    setUsingOfficial(true);
    setOperationNote("");
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
      setOperationNote(t("resultEntry.closedNote", { code: selectedPeriod.code }));
      setPreviewState(null);
      setResultDigits(["", "", ""]);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("resultEntry.closeError"));
    } finally {
      setSubmitting(false);
      setCloseConfirmOpen(false);
    }
  }

  async function handleEnterResult() {
    if (!selectedPeriod || !isResultComplete) return;

    // Only claim official provenance if the digits still match the fetched number.
    const isOfficialConfirmed =
      usingOfficial &&
      officialResult?.available === true &&
      officialNumber === resultNumber;

    setSubmitting(true);
    setError("");
    try {
      const summary = await enterResult(
        selectedPeriod.id,
        resultNumber,
        isOfficialConfirmed ? "api_checked_manual_confirmed" : "manual",
      );
      const batch = await getSettlementBatch(summary.settlement_batch_id).catch(() => null);
      setPreviewState({ summary, batch });
      setOperationNote(summary.detail);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("resultEntry.enterError"));
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
              {t("resultEntry.title")}
            </h1>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-[0_10px_30px_rgba(120,53,15,0.05)]">
          <p className="text-sm font-medium leading-6 text-amber-950">
            {t("resultEntry.warning")}
          </p>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${cardClassName} p-5 text-sm text-[var(--color-muted-foreground)]`}>
            {t("resultEntry.loading")}
          </div>
        ) : periods.length === 0 ? (
          <EmptyState
            title={t("resultEntry.emptyTitle")}
            description={t("resultEntry.emptyDesc")}
            action={
              <Link href="/result-periods?action=create">
                <ActionButton>{t("resultEntry.createPeriod")}</ActionButton>
              </Link>
            }
          />
        ) : (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
            <div className={`${cardClassName} p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                    {t("resultEntry.enterResultHeading")}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {t("resultEntry.enterResultDesc", { length: numberLength })}
                  </p>
                </div>
                <StatusBadge status={selectedPeriod ? statusTone(selectedPeriod.status) : "neutral"}>
                  {selectedPeriod ? statusLabel(selectedPeriod.status) : t("resultEntry.unavailable")}
                </StatusBadge>
              </div>

              <div className="mt-5 space-y-5">
                <div className="space-y-2">
                  <FieldLabel>{t("resultEntry.resultPeriod")}</FieldLabel>
                  <DropdownFilter
                    label={t("resultEntry.resultPeriod")}
                    options={resultPeriodOptions}
                    selectedValue={selectedPeriodId}
                    onChange={(value) => {
                      setSelectedPeriodId(value);
                      setPreviewState(null);
                      setOperationNote("");
                      setResultDigits(["", "", ""]);
                      setOfficialResult(null);
                      setUsingOfficial(false);
                    }}
                  />
                </div>

                {officialResult?.available ? (
                  <div className="space-y-3 rounded-2xl border border-[var(--color-primary)] bg-[var(--color-surface-subtle)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                          {t("resultEntry.officialLabel", {
                            kind: "3D",
                            source: officialResult.source.toUpperCase(),
                          })}
                        </p>
                        <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.3em] text-[var(--color-foreground)]">
                          {officialNumber ?? "—"}
                        </p>
                      </div>
                      {officialResult.cross_check_ok === true ? (
                        <StatusBadge status="success">{t("resultEntry.verified")}</StatusBadge>
                      ) : officialResult.cross_check_ok === false ? (
                        <StatusBadge status="danger">{t("resultEntry.sourceMismatch")}</StatusBadge>
                      ) : (
                        <StatusBadge status="warning">{t("resultEntry.unverified")}</StatusBadge>
                      )}
                    </div>
                    <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                      {officialResult.cross_check_ok === false
                        ? t("resultEntry.crossMismatch")
                        : officialResult.cross_check_ok === null
                          ? t("resultEntry.crossNull")
                          : t("resultEntry.crossAgree")}
                    </p>
                    <ActionButton
                      variant="secondary"
                      className="h-9"
                      onClick={applyOfficialResult}
                      disabled={officialResult.cross_check_ok === false || !officialNumber || submitting}
                    >
                      {usingOfficial ? t("resultEntry.officialApplied") : t("resultEntry.useOfficial")}
                    </ActionButton>
                  </div>
                ) : officialResult && !officialResult.available ? (
                  <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                    {t("resultEntry.noOfficial")}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <FieldLabel>{t("resultEntry.resultNumber")}</FieldLabel>
                  <div className="flex gap-3">
                    {Array.from({ length: numberLength }).map((_, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          digitRefs.current[index] = element;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={resultDigits[index] ?? ""}
                        onChange={(event) => handleDigitChange(index, event.target.value)}
                        onKeyDown={(event) => handleDigitKeyDown(index, event)}
                        className="h-14 w-16 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-center text-2xl font-semibold text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                        aria-label={t("resultEntry.digitAria", { n: index + 1 })}
                      />
                    ))}
                  </div>
                  <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                    {t("resultEntry.hint3")}
                  </p>
                </div>

                {operationNote ? (
                  <div className="rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3">
                    <p className="text-sm text-[var(--badge-success-fg)]">{operationNote}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <ActionButton variant="secondary" onClick={() => setCloseConfirmOpen(true)} disabled={submitting}>
                    {t("resultEntry.closePeriod")}
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    onClick={() => setConfirmOpen(true)}
                    disabled={!isResultComplete || submitting}
                  >
                    {t("resultEntry.previewSettlement")}
                  </ActionButton>
                  <ActionButton onClick={() => setConfirmOpen(true)} disabled={!isResultComplete || submitting}>
                    {t("resultEntry.enterResult")}
                  </ActionButton>
                </div>
              </div>
            </div>

            <div className={`${cardClassName} p-5`}>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                {t("resultEntry.currentPeriodInfo")}
              </h2>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                  <span className="text-sm text-[var(--color-muted-foreground)]">{t("resultEntry.periodCode")}</span>
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    {selectedPeriod?.code ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                  <span className="text-sm text-[var(--color-muted-foreground)]">{t("resultEntry.resultDate")}</span>
                  <span className="text-sm font-medium text-[var(--color-foreground)]">
                    {formatDateOnly(selectedPeriod?.result_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                  <span className="text-sm text-[var(--color-muted-foreground)]">{t("resultEntry.closeTime")}</span>
                  <span className="text-sm font-medium text-[var(--color-foreground)]">
                    {formatTimeOnly(selectedPeriod?.default_close_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                  <span className="text-sm text-[var(--color-muted-foreground)]">{t("common.status")}</span>
                  <StatusBadge status={selectedPeriod ? statusTone(selectedPeriod.status) : "neutral"}>
                    {selectedPeriod ? statusLabel(selectedPeriod.status) : t("resultEntry.unavailable")}
                  </StatusBadge>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                  <span className="text-sm text-[var(--color-muted-foreground)]">{t("resultEntry.totalCollected")}</span>
                  <span className="whitespace-nowrap text-sm font-medium text-[var(--color-foreground)]">
                    {previewState ? formatMmkAmount(previewState.summary.total_collected) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[var(--color-muted-foreground)]">{t("resultEntry.activeLedger")}</span>
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
                {t("resultEntry.settlementPreview")}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {t("resultEntry.previewDesc")}
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-5">
              {[
                [t("resultEntry.totalCollected"), formatMmkAmount(previewState.summary.total_collected)],
                [t("resultEntry.totalSettlement"), formatMmkAmount(previewState.summary.total_settlement)],
                [t("resultEntry.reserveRequired"), formatMmkAmount(previewState.summary.reserve_required)],
                [t("resultEntry.profitLoss"), formatMmkAmount(previewState.summary.profit_loss)],
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
                  {t("common.status")}
                </p>
                <div className="mt-2">
                  <StatusBadge status={statusTone(previewState.summary.status)}>
                    {statusLabel(previewState.summary.status)}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <DataTable
              title={t("resultEntry.matchedUsers")}
              description={t("resultEntry.matchedUsersDesc")}
              rows={previewState.batch?.items ?? []}
              columns={matchedColumns}
              tableClassName="min-w-[980px]"
              emptyState={
                <EmptyState
                  title={t("resultEntry.noMatchedUsers")}
                  description={t("resultEntry.noMatchedUsersDesc")}
                />
              }
            />
          </section>
        ) : null}
      </div>

      <ConfirmModal
        open={closeConfirmOpen}
        title={t("resultEntry.confirmCloseTitle")}
        description={t("resultEntry.confirmCloseDesc", { code: selectedPeriod?.code ?? "" })}
        confirmLabel={t("resultEntry.confirmCloseLabel")}
        cancelLabel={t("resultEntry.cancel")}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={handleClosePeriod}
      />

      <ConfirmModal
        open={confirmOpen}
        title={t("resultEntry.confirmEnterTitle")}
        description={t("resultEntry.confirmEnterDesc", { number: resultNumber, code: selectedPeriod?.code ?? "" })}
        confirmLabel={t("resultEntry.confirmEnterLabel")}
        cancelLabel={t("resultEntry.cancel")}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleEnterResult}
      />
    </>
  );
}
