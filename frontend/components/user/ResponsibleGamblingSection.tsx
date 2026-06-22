"use client";

import { useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserField, userInputClassName } from "@/components/user/UserPrimitives";
import {
  getResponsibleGambling,
  updateResponsibleGambling,
  type ApiRgControl,
} from "@/lib/api/compliance";

const EXCLUSION_OPTIONS = [
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
];

export function ResponsibleGamblingSection() {
  const [control, setControl] = useState<ApiRgControl | null>(null);
  const [depositLimit, setDepositLimit] = useState("");
  const [stakeLimit, setStakeLimit] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getResponsibleGambling()
      .then((data) => {
        if (!active) return;
        setControl(data);
        setDepositLimit(data.daily_deposit_limit ?? "");
        setStakeLimit(data.daily_stake_limit ?? "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const excludedUntil =
    control?.self_excluded_until && new Date(control.self_excluded_until) > new Date()
      ? new Date(control.self_excluded_until)
      : null;

  async function saveLimits() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateResponsibleGambling({
        daily_deposit_limit: depositLimit.trim() === "" ? null : depositLimit.trim(),
        daily_stake_limit: stakeLimit.trim() === "" ? null : stakeLimit.trim(),
      });
      setControl(updated);
      setMessage("Limits saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save limits.");
    } finally {
      setBusy(false);
    }
  }

  async function selfExclude(ms: number) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const until = new Date(new Date().getTime() + ms).toISOString();
      const updated = await updateResponsibleGambling({ self_excluded_until: until });
      setControl(updated);
      setMessage("Self-exclusion is active.");
    } catch (excludeError) {
      setError(excludeError instanceof Error ? excludeError.message : "Could not self-exclude.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          Responsible gambling
        </h2>
        {excludedUntil ? (
          <StatusBadge status="danger">Self-excluded</StatusBadge>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Set daily limits for your own protection. Leave a field blank for no limit.
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <UserField label="Daily deposit limit (MMK)">
          <input
            value={depositLimit}
            onChange={(event) => setDepositLimit(event.target.value.replace(/[^\d.]/g, ""))}
            className={userInputClassName}
            placeholder="No limit"
            disabled={busy}
          />
        </UserField>
        <UserField label="Daily betting limit (MMK)">
          <input
            value={stakeLimit}
            onChange={(event) => setStakeLimit(event.target.value.replace(/[^\d.]/g, ""))}
            className={userInputClassName}
            placeholder="No limit"
            disabled={busy}
          />
        </UserField>
      </div>

      <div className="mt-4">
        <ActionButton onClick={saveLimits} disabled={busy}>
          Save Limits
        </ActionButton>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <p className="text-sm font-medium text-[var(--color-foreground)]">Self-exclude</p>
        {excludedUntil ? (
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Betting and deposits are disabled until{" "}
            <span className="font-medium text-[var(--color-foreground)]">
              {excludedUntil.toLocaleString()}
            </span>
            .
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
              Temporarily disable deposits and betting. You can still withdraw.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXCLUSION_OPTIONS.map((option) => (
                <ActionButton
                  key={option.label}
                  variant="secondary"
                  className="h-10 rounded-xl px-4"
                  onClick={() => selfExclude(option.ms)}
                  disabled={busy}
                >
                  {option.label}
                </ActionButton>
              ))}
            </div>
          </>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-[var(--color-danger)]">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm font-medium text-[var(--color-success)]">{message}</p>
      ) : null}
    </section>
  );
}
