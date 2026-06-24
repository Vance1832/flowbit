"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { COUNTRY_CODE_OPTIONS, DEFAULT_COUNTRY_CODE } from "@/lib/phone";

const inputClassName =
  "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

export function RegisterScreen() {
  const router = useRouter();
  const t = useTranslations();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !phoneNumber.trim() || !password.trim() || !confirmPassword.trim()) {
      setSuccess("");
      setError(t("register.requiredFields"));
      return;
    }

    if (!countryCode.startsWith("+")) {
      setSuccess("");
      setError(t("register.countryPlus"));
      return;
    }

    if (!/^\+\d{1,4}$/.test(countryCode.trim())) {
      setSuccess("");
      setError(t("register.countryDigits"));
      return;
    }

    if (!/^\d+$/.test(phoneNumber.trim())) {
      setSuccess("");
      setError(t("register.phoneDigitsOnly"));
      return;
    }

    const normalizedPhoneNumber = phoneNumber.trim().replace(/\s+/g, "");
    const phoneDigits = normalizedPhoneNumber.startsWith("0")
      ? normalizedPhoneNumber.slice(1)
      : normalizedPhoneNumber;

    if (phoneDigits.length < 7 || phoneDigits.length > 12) {
      setSuccess("");
      setError(t("register.phoneLength"));
      return;
    }

    if (password !== confirmPassword) {
      setSuccess("");
      setError(t("register.passwordsMatch"));
      return;
    }

    if (password.length < 8) {
      setSuccess("");
      setError(t("register.passwordMin"));
      return;
    }

    setSubmitting(true);
    setError("");
    const result = await register({
      name: name.trim(),
      phone_country_code: countryCode.trim(),
      phone_number: normalizedPhoneNumber,
      email: email.trim() || undefined,
      password,
      confirm_password: confirmPassword,
    });

    if (!result.ok) {
      setSuccess("");
      setError(result.error ?? t("register.createFailed"));
      setSubmitting(false);
      return;
    }

    setSuccess(t("register.success"));
    window.setTimeout(() => {
      router.push("/login");
    }, 900);
    setSubmitting(false);
  }

  return (
    <AuthShell
      footer={
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("register.alreadyHaveAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
          >
            {t("register.signIn")}
          </Link>
        </p>
      }
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {t("register.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          {t("register.subtitle")}
        </p>
      </div>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            {t("register.name")}
          </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder={t("register.namePlaceholder")}
              disabled={submitting}
            />
        </div>

        <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("register.countryCode")}
            </label>
            <DropdownFilter
              label="Phone Country Code"
              options={COUNTRY_CODE_OPTIONS as { label: string; value: string }[]}
              selectedValue={countryCode}
              onChange={setCountryCode}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("register.phoneNumber")}
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
            {t("register.email")}{" "}
            <span className="text-[var(--color-muted-foreground)]">{t("register.optional")}</span>
          </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClassName}
              placeholder={t("register.emailPlaceholder")}
              disabled={submitting}
            />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("register.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
              placeholder={t("register.passwordPlaceholder")}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("register.confirmPassword")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
              placeholder={t("register.confirmPlaceholder")}
              disabled={submitting}
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            {success}
          </div>
        ) : null}

        <ActionButton type="submit" className="h-12 w-full rounded-2xl" disabled={submitting}>
          {submitting ? t("register.creatingAccount") : t("register.createAccount")}
        </ActionButton>
      </form>
    </AuthShell>
  );
}
