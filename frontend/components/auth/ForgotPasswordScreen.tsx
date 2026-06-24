"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { confirmPasswordReset, requestPasswordReset } from "@/lib/api/auth";
import { COUNTRY_CODE_OPTIONS, DEFAULT_COUNTRY_CODE, combinePhone } from "@/lib/phone";

const inputClassName =
  "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

type Step = "request" | "confirm";

export function ForgotPasswordScreen() {
  const t = useTranslations();
  const [step, setStep] = useState<Step>("request");
  const [succeeded, setSucceeded] = useState(false);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const phone = combinePhone(countryCode, phoneNumber);

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phoneNumber.trim()) {
      setError(t("forgotPassword.enterPhone"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await requestPasswordReset(phone);
      // The backend always responds generically (no account enumeration).
      setNotice(
        result.debug_code
          ? t("forgotPassword.noticeDev", { code: result.debug_code })
          : t("forgotPassword.noticeSent"),
      );
      setStep("confirm");
    } catch {
      setError(t("forgotPassword.requestFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || !newPassword || !confirmPassword) {
      setError(t("forgotPassword.codeRequired"));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("forgotPassword.passwordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("forgotPassword.passwordsMatch"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await confirmPasswordReset({
        phone: phone.trim(),
        code: code.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSucceeded(true);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : t("forgotPassword.invalidCode"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      footer={
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("forgotPassword.rememberedIt")}{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
          >
            {t("forgotPassword.backToLogin")}
          </Link>
        </p>
      }
    >
      {succeeded ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
              {t("forgotPassword.doneTitle")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              {t("forgotPassword.doneSubtitle")}
            </p>
          </div>
          <Link href="/login">
            <ActionButton className="h-12 w-full rounded-2xl">
              {t("forgotPassword.goToLogin")}
            </ActionButton>
          </Link>
        </div>
      ) : (
      <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {t("forgotPassword.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          {step === "request"
            ? t("forgotPassword.requestSubtitle")
            : t("forgotPassword.confirmSubtitle")}
        </p>
      </div>

      {notice ? (
        <div className="mt-6 rounded-2xl border border-[var(--badge-info-ring)] bg-[var(--badge-info-bg)] px-4 py-3 text-sm text-[var(--badge-info-fg)]">
          {notice}
        </div>
      ) : null}

      {step === "request" ? (
        <form className="mt-7 space-y-5" onSubmit={handleRequest}>
          <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-foreground)]">
                {t("forgotPassword.country")}
              </label>
              <DropdownFilter
                label="Country code"
                options={COUNTRY_CODE_OPTIONS as { label: string; value: string }[]}
                selectedValue={countryCode}
                onChange={setCountryCode}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-foreground)]">
                {t("forgotPassword.phone")}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className={inputClassName}
                placeholder="912345678"
                disabled={submitting}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
              {error}
            </div>
          ) : null}

          <ActionButton type="submit" className="h-12 w-full rounded-2xl" disabled={submitting}>
            {submitting ? t("forgotPassword.sending") : t("forgotPassword.sendCode")}
          </ActionButton>
        </form>
      ) : (
        <form className="mt-7 space-y-5" onSubmit={handleConfirm}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("forgotPassword.resetCode")}
            </label>
            <input
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className={inputClassName}
              placeholder={t("forgotPassword.codePlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("forgotPassword.newPassword")}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClassName}
              placeholder={t("forgotPassword.newPasswordPlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("forgotPassword.confirmNewPassword")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
              placeholder={t("forgotPassword.confirmPlaceholder")}
              disabled={submitting}
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
              {error}
            </div>
          ) : null}

          <ActionButton type="submit" className="h-12 w-full rounded-2xl" disabled={submitting}>
            {submitting ? t("forgotPassword.resetting") : t("forgotPassword.resetPassword")}
          </ActionButton>

          <button
            type="button"
            onClick={() => {
              setStep("request");
              setError("");
              setNotice("");
            }}
            className="text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
          >
            {t("forgotPassword.differentPhone")}
          </button>
        </form>
      )}
      </>
      )}
    </AuthShell>
  );
}
