"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserField, userInputClassName } from "@/components/user/UserPrimitives";
import {
  getResponsibleGambling,
  updateResponsibleGambling,
  type ApiRgControl,
} from "@/lib/api/compliance";

export function ResponsibleGamblingSection() {
  const t = useTranslations();
  const exclusionOptions = [
    { label: t("rg.h24"), ms: 24 * 60 * 60 * 1000 },
    { label: t("rg.d7"), ms: 7 * 24 * 60 * 60 * 1000 },
    { label: t("rg.d30"), ms: 30 * 24 * 60 * 60 * 1000 },
  ];
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
      setMessage(t("rg.limitsSaved"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("rg.saveFailed"));
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
      setMessage(t("rg.selfExclusionActive"));
    } catch (excludeError) {
      setError(excludeError instanceof Error ? excludeError.message : t("rg.excludeFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          {t("rg.title")}
        </h2>
        {excludedUntil ? (
          <StatusBadge status="danger">{t("rg.selfExcluded")}</StatusBadge>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {t("rg.subtitle")}
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <UserField label={t("rg.depositLimit")}>
          <input
            value={depositLimit}
            onChange={(event) => setDepositLimit(event.target.value.replace(/[^\d.]/g, ""))}
            className={userInputClassName}
            placeholder={t("rg.noLimit")}
            disabled={busy}
          />
        </UserField>
        <UserField label={t("rg.bettingLimit")}>
          <input
            value={stakeLimit}
            onChange={(event) => setStakeLimit(event.target.value.replace(/[^\d.]/g, ""))}
            className={userInputClassName}
            placeholder={t("rg.noLimit")}
            disabled={busy}
          />
        </UserField>
      </div>

      <div className="mt-4">
        <ActionButton onClick={saveLimits} disabled={busy}>
          {t("rg.saveLimits")}
        </ActionButton>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <p className="text-sm font-medium text-[var(--color-foreground)]">{t("rg.selfExclude")}</p>
        {excludedUntil ? (
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {t("rg.excludedUntil", { date: excludedUntil.toLocaleString() })}
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
              {t("rg.selfExcludeHint")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {exclusionOptions.map((option) => (
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
