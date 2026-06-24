"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { COUNTRY_CODE_OPTIONS, DEFAULT_COUNTRY_CODE, combinePhone } from "@/lib/phone";

const inputClassName =
  "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

export function LoginScreen() {
  const router = useRouter();
  const t = useTranslations();
  const { getDefaultRoute, login, verify2fa } = useAuth();
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Second-factor challenge state, set when the backend requests an OTP.
  const [challengePhone, setChallengePhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!phoneNumber.trim() || !password.trim()) {
      setError(t("login.phonePasswordRequired"));
      return;
    }

    setSubmitting(true);
    const result = await login(combinePhone(countryCode, phoneNumber), password);

    if (result.twoFactorRequired && result.phone) {
      setError("");
      setChallengePhone(result.phone);
      setNotice(
        result.debugCode
          ? t("login.codeSentDev", { code: result.debugCode })
          : t("login.codeSent"),
      );
      setSubmitting(false);
      return;
    }

    if (!result.ok) {
      setError(result.error ?? t("login.loginFailed"));
      setSubmitting(false);
      return;
    }

    setError("");
    setSubmitting(false);
    router.push(getDefaultRoute(result.role));
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challengePhone) return;

    if (!code.trim()) {
      setError(t("login.enterCode"));
      return;
    }

    setSubmitting(true);
    const result = await verify2fa(challengePhone, code);
    if (!result.ok) {
      setError(result.error ?? t("login.verificationFailed"));
      setSubmitting(false);
      return;
    }

    setError("");
    setSubmitting(false);
    router.push(getDefaultRoute(result.role));
  }

  function cancelChallenge() {
    setChallengePhone(null);
    setCode("");
    setError("");
    setNotice("");
    setPassword("");
  }

  if (challengePhone) {
    return (
      <AuthShell
        footer={
          <button
            type="button"
            onClick={cancelChallenge}
            className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
          >
            {t("login.backToLogin")}
          </button>
        }
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            {t("login.twoFactorTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            {t("login.twoFactorSubtitle")}
          </p>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handleVerify}>
          {notice ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              {notice}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("login.code")}
            </label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, ""))}
              className={inputClassName}
              placeholder="123456"
              maxLength={6}
              disabled={submitting}
              autoFocus
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
              {error}
            </div>
          ) : null}

          <ActionButton
            type="submit"
            className="h-12 w-full rounded-2xl"
            disabled={submitting}
          >
            {submitting ? t("login.verifying") : t("login.verify")}
          </ActionButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      footer={
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("login.needAccount")}{" "}
          <Link
            href="/register"
            className="font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
          >
            {t("login.register")}
          </Link>
        </p>
      }
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {t("login.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          {t("login.subtitle")}
        </p>
      </div>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("login.country")}
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
              {t("login.phone")}
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

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            {t("login.password")}
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
            placeholder="••••••••"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
            >
              {t("login.forgotPassword")}
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

        <ActionButton
          type="submit"
          className="h-12 w-full rounded-2xl"
          disabled={submitting}
        >
          {submitting ? t("login.signingIn") : t("login.signIn")}
        </ActionButton>

        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          {t("login.authorizedNotice")}
        </p>
      </form>
    </AuthShell>
  );
}
