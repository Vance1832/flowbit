"use client";

import { useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SearchInput } from "@/components/ui/filters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatMmk,
  useUserApp,
  type UserReceiptItem,
} from "@/components/providers/UserAppProvider";
import {
  UserField,
  UserPageHeader,
  userInputClassName,
} from "@/components/user/UserPrimitives";

type SelectedNumber = UserReceiptItem;

const rangeTabs = [
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

function rangeFromNumber(value: string) {
  if (!/^\d{3}$/.test(value)) {
    return null;
  }
  const numericValue = Number(value);
  const start = Math.floor(numericValue / 100) * 100;
  const end = start + 99;
  return `${String(start).padStart(3, "0")}–${String(end).padStart(3, "0")}`;
}

function numbersForRange(range: string) {
  const [startRaw, endRaw] = range.split("–");
  const start = Number(startRaw);
  const end = Number(endRaw);

  return Array.from({ length: end - start + 1 }, (_, index) =>
    String(start + index).padStart(3, "0"),
  );
}

export function UserSubmitNumbersScreen() {
  const { currentPeriod, availableBalance, submitReceipt } = useUserApp();
  const [activeRange, setActiveRange] = useState("100–199");
  const [numberSearch, setNumberSearch] = useState("");
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [useR, setUseR] = useState(false);
  const [items, setItems] = useState<SelectedNumber[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const visibleNumbers = useMemo(() => numbersForRange(activeRange), [activeRange]);

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
    return items.reduce((sum, item) => {
      const multiplier = item.useR ? item.generatedNumbers.length : 1;
      return sum + item.amount * multiplier;
    }, 0);
  }, [items]);

  const balanceAfterSubmit = availableBalance - totalAmount;

  function handleSearchChange(value: string) {
    const normalized = value.replace(/\D/g, "").slice(0, 3);
    setNumberSearch(normalized);

    const nextRange = rangeFromNumber(normalized);
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

  function addItem() {
    if (selectedNumbers.length === 0) {
      setError("Select at least one 3-digit number.");
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount) {
      setError("Amount is required.");
      return;
    }
    if (numericAmount < 500) {
      setError("Minimum amount is MMK 500.");
      return;
    }

    const nextItems = selectedNumbers.map((number) => {
      const relatedNumbers = useR ? buildRelatedNumbers(number) : [];
      return {
        number,
        amount: numericAmount,
        useR,
        generatedNumbers: relatedNumbers,
      };
    });

    const nextTotal = nextItems.reduce((sum, item) => {
      const multiplier = item.useR ? item.generatedNumbers.length : 1;
      return sum + item.amount * multiplier;
    }, 0);

    if (nextTotal > availableBalance) {
      setError("Amount cannot exceed available balance.");
      return;
    }

    setItems((current) => [...current, ...nextItems]);
    setError("");
    setSuccess("");
    resetEntryPanel();
  }

  return (
    <>
      <div className="space-y-6">
        <UserPageHeader
          title="Submit Numbers"
          subtitle="Choose numbers and submit your receipt for the current open period."
        />

        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  Period
                </p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
                  {currentPeriod.code}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  Status
                </p>
                <div className="mt-2">
                  <StatusBadge status="success">{currentPeriod.status}</StatusBadge>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  Closes at
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
                  {currentPeriod.closesAt}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                Available Balance
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
                {formatMmk(availableBalance)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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
                placeholder="Search 3-digit number, e.g. 124"
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
                  Selected numbers: {selectedNumbers.length}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {selectedNumbers.length > 0 ? selectedNumbers.join(", ") : "No numbers selected"}
                </p>
              </div>
              <ActionButton
                variant="secondary"
                className="h-10 rounded-xl px-4"
                onClick={resetEntryPanel}
                disabled={selectedNumbers.length === 0}
              >
                Clear Selection
              </ActionButton>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Selected Numbers
              </p>
              <p className="mt-2 text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {selectedNumbers.length > 0 ? selectedNumbers.length : "—"}
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                {selectedNumbers.length > 0 ? selectedNumbers.join(", ") : "No numbers selected"}
              </p>
            </div>

            <UserField label="Amount">
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
                className={userInputClassName}
                placeholder="Minimum MMK 500"
              />
            </UserField>

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">Use R</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                  R creates related number combinations automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseR((current) => !current)}
                className={`flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 ${
                  useR
                    ? "border-emerald-200 bg-emerald-50 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)]"
                }`}
              >
                <span>Use R</span>
                <span>{useR ? "On" : "Off"}</span>
              </button>
            </div>

            {useR && generatedPreview.length > 0 ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  Generated
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

            <ActionButton onClick={addItem}>Add to Receipt</ActionButton>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              Selected Numbers
            </h2>
          </div>
          {items.length === 0 ? (
            <div className="px-5 py-6 text-sm text-[var(--color-muted-foreground)]">
              No numbers selected yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)]">
                <thead className="bg-[var(--color-surface-muted)]">
                  <tr>
                    {["Number", "Amount", "R", "Generated Numbers", "Total", "Action"].map((header) => (
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
                    const total = item.amount * (item.useR ? item.generatedNumbers.length : 1);
                    return (
                      <tr key={`${item.number}-${index}`} className="hover:bg-[var(--color-surface-subtle)]">
                        <td className="px-5 py-3.5 text-sm font-medium text-[var(--color-foreground)]">
                          {item.number}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[var(--color-foreground)]">
                          {formatMmk(item.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[var(--color-foreground)]">
                          {item.useR ? "Yes" : "No"}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                          {item.generatedNumbers.length > 0 ? item.generatedNumbers.join(", ") : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[var(--color-foreground)]">
                          {formatMmk(total)}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            className="text-sm font-semibold text-[var(--color-danger)] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
                            onClick={() =>
                              setItems((current) => current.filter((_, innerIndex) => innerIndex !== index))
                            }
                          >
                            Remove
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

        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Total Amount
              </p>
              <p className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {formatMmk(totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Available Balance
              </p>
              <p className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {formatMmk(availableBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Balance After Submit
              </p>
              <p className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {formatMmk(balanceAfterSubmit)}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <ActionButton
              disabled={items.length === 0 || totalAmount > availableBalance}
              onClick={() => setConfirmOpen(true)}
            >
              Submit Receipt
            </ActionButton>
          </div>
        </section>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Submit Receipt?"
        description={`You are about to submit selected numbers for ${currentPeriod.code}.`}
        confirmLabel="Submit Receipt"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          submitReceipt({ period: currentPeriod.code, items });
          setConfirmOpen(false);
          setItems([]);
          resetEntryPanel();
          setError("");
          setSuccess("Receipt submitted successfully.");
        }}
      >
        <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
          <div className="flex items-center justify-between gap-3">
            <span>Result Period</span>
            <span className="font-semibold text-[var(--color-foreground)]">{currentPeriod.code}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Total Amount</span>
            <span className="font-semibold text-[var(--color-foreground)]">{formatMmk(totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Balance After Submit</span>
            <span className="font-semibold text-[var(--color-foreground)]">{formatMmk(balanceAfterSubmit)}</span>
          </div>
          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
              Selected Numbers
            </p>
            <div className="mt-2 space-y-2">
              {items.map((item, index) => (
                <div
                  key={`${item.number}-${index}`}
                  className="flex items-start justify-between gap-4 rounded-xl bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {item.number}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      {item.useR && item.generatedNumbers.length > 0
                        ? item.generatedNumbers.join(", ")
                        : "No generated numbers"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    {formatMmk(item.amount * (item.useR ? item.generatedNumbers.length : 1))}
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
