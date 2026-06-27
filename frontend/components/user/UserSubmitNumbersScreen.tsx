"use client";

import { useEffect, useMemo, useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/filters";
import { HeroPill, PageHero } from "@/components/ui/PageHero";
import { formatMmk, useUserApp } from "@/components/providers/UserAppProvider";
import {
  getUserCurrentResultPeriod,
  type ApiUserCurrentResultPeriod,
} from "@/lib/api/ledgers";
import {
  UserField,
  UserPageHeader,
  userInputClassName,
} from "@/components/user/UserPrimitives";

// Each preview row is a single number with its own amount. R-generated numbers
// are expanded into individual rows so they can be edited or removed before
// confirming (proposal §7.4), and submitted as individual numbers.
type DraftItem = {
  number: string;
  amount: number;
  source?: string;
};

// Numbers are 3 digits (3D), paged in hundreds.
function rangeTabsFor(): string[] {
  return [
    "000–099",
    "100–199",
    "200–299",
    "300–399",
    "400–499",
    "500–599",
    "600–699",
    "700–799",
    "800–899",
    "900–999",
  ];
}

function buildRelatedNumbers(value: string) {
  const chars = value.split("");
  const combinations = new Set<string>();

  function permute(prefix: string[], remaining: string[]) {
    if (remaining.length === 0) {
      combinations.add(prefix.join(""));
      return;
    }

    remaining.forEach((char, index) => {
      permute(
        [...prefix, char],
        remaining.filter((_, innerIndex) => innerIndex !== index),
      );
    });
  }

  permute([], chars);
  return [...combinations].sort();
}

function rangeFromNumber(value: string, length: number) {
  if (!new RegExp(`^\\d{${length}}$`).test(value)) {
    return null;
  }
  const numericValue = Number(value);
  const start = Math.floor(numericValue / 100) * 100;
  const end = start + 99;
  return `${String(start).padStart(3, "0")}–${String(end).padStart(3, "0")}`;
}

function numbersForRange(range: string, length: number) {
  const [startRaw, endRaw] = range.split("–");
  const start = Number(startRaw);
  const end = Number(endRaw);

  return Array.from({ length: end - start + 1 }, (_, index) =>
    String(start + index).padStart(length, "0"),
  );
}

export function UserSubmitNumbersScreen() {
  const t = useTranslations();
  const { error: providerError, availableBalance, submitReceipt } = useUserApp();

  const [period, setPeriod] = useState<ApiUserCurrentResultPeriod | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeRange, setActiveRange] = useState("100–199");
  const [numberSearch, setNumberSearch] = useState("");
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [useR, setUseR] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [quickValue, setQuickValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const numberLength = 3;
  const rangeTabs = useMemo(() => rangeTabsFor(), []);

  // Fetch the open 3D period once on mount.
  useEffect(() => {
    let active = true;
    getUserCurrentResultPeriod()
      .then((result) => {
        if (active) setPeriod(result);
      })
      .catch(() => {
        if (active) setPeriod(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Map the API period to the shape the view uses (keeps existing JSX intact).
  const currentPeriod = useMemo(() => {
    if (!period) return null;
    const closesAt = period.betting_closes_at
      ? new Date(period.betting_closes_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : period.default_close_time.slice(0, 5);
    return {
      code: period.code,
      status: "Open" as const,
      bettingOpen: period.betting_open,
      closesAt,
    };
  }, [period]);

  const visibleNumbers = useMemo(
    () => numbersForRange(activeRange, numberLength),
    [activeRange, numberLength],
  );

  const generatedPreview = useMemo(() => {
    if (!useR || selectedNumbers.length === 0) {
      return [];
    }
    return selectedNumbers.map((number) => ({
      number,
      generated: buildRelatedNumbers(number),
    }));
  }, [selectedNumbers, useR]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }, [items]);

  const balanceAfterSubmit = availableBalance - totalAmount;
  // Betting is only open when a ledger is inside its window (backend-authoritative).
  // The period can still read "open" before the auto-close job runs.
  const bettingOpen = currentPeriod?.bettingOpen ?? false;

  function handleSearchChange(value: string) {
    const normalized = value.replace(/\D/g, "").slice(0, numberLength);
    setNumberSearch(normalized);

    const nextRange = rangeFromNumber(normalized, numberLength);
    if (nextRange) {
      setActiveRange(nextRange);
      setSelectedNumbers((current) =>
        current.includes(normalized) ? current : [...current, normalized],
      );
    }
  }

  function handleSelectNumber(value: string) {
    setSelectedNumbers((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value].sort(),
    );
    setNumberSearch(value);
    setError("");
    setSuccess("");
  }

  function resetEntryPanel() {
    setSelectedNumbers([]);
    setNumberSearch("");
    setAmount("");
    setUseR(false);
  }

  // Shared add logic for both the grid and quick-input. Returns an error
  // message, or null on success (R numbers are expanded into individual rows).
  function addNumbers(numbers: string[], numericAmount: number, withR: boolean) {
    if (!bettingOpen) {
      return t("submit.bettingClosed");
    }
    if (numbers.length === 0) {
      return t("submit.selectAtLeast", { length: numberLength });
    }
    const lengthPattern = new RegExp(`^\\d{${numberLength}}$`);
    const invalid = numbers.find((value) => !lengthPattern.test(value));
    if (invalid) {
      const max = "9".repeat(numberLength);
      const min = "0".repeat(numberLength);
      return t("submit.invalidNumber", { invalid, length: numberLength, min, max });
    }
    if (!numericAmount) {
      return t("submit.amountRequired");
    }
    if (numericAmount < 500) {
      return t("submit.minAmount");
    }

    const nextItems: DraftItem[] = [];
    numbers.forEach((number) => {
      if (withR) {
        buildRelatedNumbers(number).forEach((generated) => {
          nextItems.push({
            number: generated,
            amount: numericAmount,
            source: `${number} R`,
          });
        });
      } else {
        nextItems.push({ number, amount: numericAmount });
      }
    });

    const nextTotal = nextItems.reduce((sum, item) => sum + item.amount, 0);
    if (totalAmount + nextTotal > availableBalance) {
      return t("submit.exceedsBalance");
    }

    setItems((current) => [...current, ...nextItems]);
    return null;
  }

  function addItem() {
    const result = addNumbers(selectedNumbers, Number(amount), useR);
    if (result) {
      setError(result);
      return;
    }
    setError("");
    setSuccess("");
    resetEntryPanel();
  }

  function quickAdd() {
    // Accepts "124 1000", "124r 1000", or "124 r 1000".
    const tokens = quickValue.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
    let withR = false;
    const rest: string[] = [];
    tokens.forEach((token) => {
      if (token === "r") withR = true;
      else rest.push(token);
    });
    let number = rest[0] ?? "";
    if (number.endsWith("r")) {
      withR = true;
      number = number.slice(0, -1);
    }
    const numericAmount = Number(rest[1]);

    if (!number || !numericAmount) {
      setError(t("submit.quickExample"));
      return;
    }

    const result = addNumbers([number], numericAmount, withR);
    if (result) {
      setError(result);
      return;
    }
    setError("");
    setSuccess("");
    setQuickValue("");
  }

  return (
    <>
      <div className="space-y-6">
        <UserPageHeader title={t("submit.title")} />

        {providerError ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {providerError}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            {t("submit.loadingPeriod")}
          </div>
        ) : null}

        {!loading && !currentPeriod ? (
          <EmptyState
            title={t("submit.noPeriodTitle")}
            description={t("submit.noPeriodDesc")}
          />
        ) : null}

        {currentPeriod ? (
        <>
        <PageHero>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/70">
                  {t("submit.period")}
                </p>
                <p className="mt-1.5 text-xl font-semibold">{currentPeriod.code}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/70">
                  {t("submit.status")}
                </p>
                <div className="mt-1.5">
                  <HeroPill>{bettingOpen ? currentPeriod.status : t("submit.closed")}</HeroPill>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/70">
                  {t("submit.closesAt")}
                </p>
                <p className="mt-1.5 text-sm font-semibold">{currentPeriod.closesAt}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/12 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/70">
                {t("submit.availableBalance")}
              </p>
              <p className="mt-1.5 text-sm font-semibold">{formatMmk(availableBalance)}</p>
            </div>
          </div>
        </PageHero>

        {!bettingOpen ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
            {t("submit.bettingClosedBanner", { code: currentPeriod.code })}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  {t("submit.quickAdd")}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {t("submit.quickAddHint")}{" "}
                  <span className="font-medium">124 1000</span> {t("submit.or")}{" "}
                  <span className="font-medium">124r 1000</span>
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={quickValue}
                  onChange={(event) => setQuickValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      quickAdd();
                    }
                  }}
                  placeholder="124 1000"
                  className="h-11 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                />
                <ActionButton className="h-11 rounded-xl px-5" onClick={quickAdd} disabled={!bettingOpen}>
                  {t("submit.add")}
                </ActionButton>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {rangeTabs.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setActiveRange(range)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeRange === range
                      ? "border-[var(--color-primary)] bg-emerald-50 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-foreground)]"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <div className="max-w-sm">
              <SearchInput
                value={numberSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={t("submit.searchPlaceholder", {
                  length: numberLength,
                  example: "124",
                })}
              />
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
              {visibleNumbers.map((value) => {
                const selected = selectedNumbers.includes(value);
                const highlighted = numberSearch.length > 0 && value === numberSearch;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleSelectNumber(value)}
                    className={`aspect-square rounded-md border text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 ${
                      selected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm"
                        : highlighted
                          ? "border-emerald-200 bg-emerald-50 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-foreground)] hover:border-emerald-200 hover:bg-emerald-50/70"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {t("submit.selectedNumbersCount", { count: selectedNumbers.length })}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {selectedNumbers.length > 0 ? selectedNumbers.join(", ") : t("submit.noNumbersSelected")}
                </p>
              </div>
              <ActionButton
                variant="secondary"
                className="h-10 rounded-xl px-4"
                onClick={resetEntryPanel}
                disabled={selectedNumbers.length === 0}
              >
                {t("submit.clearSelection")}
              </ActionButton>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {t("submit.selectedNumbers")}
              </p>
              <p className="mt-2 text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {selectedNumbers.length > 0 ? selectedNumbers.length : "—"}
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                {selectedNumbers.length > 0 ? selectedNumbers.join(", ") : t("submit.noNumbersSelected")}
              </p>
            </div>

            <UserField label={t("common.amount")}>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
                className={userInputClassName}
                placeholder={t("submit.minAmountPlaceholder")}
              />
            </UserField>

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">{t("submit.useR")}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                  {t("submit.useRHint")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseR((current) => !current)}
                className={`flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 ${
                  useR
                    ? "border-emerald-200 bg-emerald-50 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-muted-foreground)]"
                }`}
              >
                <span>{t("submit.useR")}</span>
                <span>{useR ? t("submit.on") : t("submit.off")}</span>
              </button>
            </div>

            {useR && generatedPreview.length > 0 ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  {t("submit.generated")}
                </p>
                <div className="mt-2 space-y-1.5">
                  {generatedPreview.map((entry) => (
                    <p key={entry.number} className="text-sm text-[var(--color-foreground)]">
                      {entry.number}: {entry.generated.join(", ")}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
                {error}
              </div>
            ) : null}

            <ActionButton onClick={addItem} disabled={!bettingOpen}>{t("submit.addToReceipt")}</ActionButton>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              {t("submit.receiptPreview")}
            </h2>
            {items.length > 0 ? (
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {t("submit.previewSummary", {
                  count: items.length,
                  plural: items.length === 1 ? "" : "s",
                })}
              </span>
            ) : null}
          </div>
          {items.length === 0 ? (
            <div className="px-5 py-6 text-sm text-[var(--color-muted-foreground)]">
              {t("submit.noNumbersAdded")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)]">
                <thead className="bg-[var(--color-surface-muted)]">
                  <tr>
                    {[
                      t("submit.colNumber"),
                      t("submit.colSource"),
                      t("common.amount"),
                      t("common.action"),
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-muted-foreground)]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((item, index) => {
                    return (
                      <tr key={`${item.number}-${index}`} className="hover:bg-[var(--color-surface-subtle)]">
                        <td className="px-5 py-3.5 text-sm font-medium text-[var(--color-foreground)]">
                          {item.number}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                          {item.source ?? t("submit.direct")}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[var(--color-foreground)]">
                          <input
                            inputMode="numeric"
                            aria-label={t("submit.amountForAria", { number: item.number })}
                            value={String(item.amount)}
                            onChange={(event) => {
                              const next = Number(event.target.value.replace(/[^\d]/g, "")) || 0;
                              setItems((current) =>
                                current.map((row, innerIndex) =>
                                  innerIndex === index ? { ...row, amount: next } : row,
                                ),
                              );
                              setSuccess("");
                            }}
                            className="h-9 w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            className="text-sm font-semibold text-[var(--color-danger)] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                            onClick={() =>
                              setItems((current) => current.filter((_, innerIndex) => innerIndex !== index))
                            }
                          >
                            {t("submit.remove")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {success ? (
          <div className="rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            {success}
          </div>
        ) : null}

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {t("submit.totalAmount")}
              </p>
              <p className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {formatMmk(totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {t("submit.availableBalance")}
              </p>
              <p className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {formatMmk(availableBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {t("submit.balanceAfterSubmit")}
              </p>
              <p className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {formatMmk(balanceAfterSubmit)}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <ActionButton
              disabled={!bettingOpen || items.length === 0 || totalAmount > availableBalance}
              onClick={() => setConfirmOpen(true)}
            >
              {t("submit.submitReceipt")}
            </ActionButton>
          </div>
        </section>
        </>
        ) : null}
      </div>

      <ConfirmModal
        open={confirmOpen && currentPeriod !== null}
        title={t("submit.confirmTitle")}
        description={t("submit.confirmDesc", { code: currentPeriod?.code ?? "—" })}
        confirmLabel={t("submit.submitReceipt")}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (!currentPeriod) return;
          try {
            await submitReceipt({
              period: currentPeriod.code,
              // R was already expanded into individual rows, so each number is
              // submitted directly.
              items: items.map((item) => ({
                number: item.number,
                amount: item.amount,
                useR: false,
                generatedNumbers: [],
              })),
            });
            setConfirmOpen(false);
            setItems([]);
            resetEntryPanel();
            setError("");
            setSuccess(t("submit.submitSuccess"));
          } catch (submitError) {
            setConfirmOpen(false);
            setError(submitError instanceof Error ? submitError.message : t("submit.submitFailed"));
          }
        }}
      >
        <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
          <div className="flex items-center justify-between gap-3">
            <span>{t("submit.resultPeriod")}</span>
            <span className="font-semibold text-[var(--color-foreground)]">{currentPeriod?.code ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>{t("submit.totalAmount")}</span>
            <span className="font-semibold text-[var(--color-foreground)]">{formatMmk(totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>{t("submit.balanceAfterSubmit")}</span>
            <span className="font-semibold text-[var(--color-foreground)]">{formatMmk(balanceAfterSubmit)}</span>
          </div>
          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
              {t("submit.numbersCount", { count: items.length })}
            </p>
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
              {items.map((item, index) => (
                <div
                  key={`${item.number}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-xl bg-[var(--color-surface-raised)] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {item.number}
                    </p>
                    {item.source ? (
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {t("submit.fromSource", { source: item.source })}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    {formatMmk(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ConfirmModal>
    </>
  );
}
