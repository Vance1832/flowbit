"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { ActionButton } from "@/components/ui/ActionButton";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { confirmPasswordReset, requestPasswordReset } from "@/lib/api/auth";
import { COUNTRY_CODE_OPTIONS, DEFAULT_COUNTRY_CODE, combinePhone } from "@/lib/phone";

const inputClassName =
  "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

type Step = "request" | "confirm";

export function ForgotPasswordScreen() {
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
      setError("Enter your phone number.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await requestPasswordReset(phone);
      // The backend always responds generically (no account enumeration).
      setNotice(
        result.debug_code
          ? `Dev mode: your reset code is ${result.debug_code}`
          : "If that phone is registered, a reset code has been sent.",
      );
      setStep("confirm");
    } catch {
      setError("Could not request a reset code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || !newPassword || !confirmPassword) {
      setError("Code and both password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
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
        confirmError instanceof Error ? confirmError.message : "Invalid or expired code.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      footer={
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
          >
            Back to login
          </Link>
        </p>
      }
    >
      {succeeded ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
              Password reset
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </div>
          <Link href="/login">
            <ActionButton className="h-12 w-full rounded-2xl">Go to login</ActionButton>
          </Link>
        </div>
      ) : (
      <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Reset password
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          {step === "request"
            ? "Enter your phone number and we'll send a one-time reset code."
            : "Enter the code we sent and choose a new password."}
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
                Country
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
                Phone
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
            {submitting ? "Sending..." : "Send reset code"}
          </ActionButton>
        </form>
      ) : (
        <form className="mt-7 space-y-5" onSubmit={handleConfirm}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Reset code
            </label>
            <input
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className={inputClassName}
              placeholder="6-digit code"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClassName}
              placeholder="At least 8 characters"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
              placeholder="Re-enter new password"
              disabled={submitting}
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
              {error}
            </div>
          ) : null}

          <ActionButton type="submit" className="h-12 w-full rounded-2xl" disabled={submitting}>
            {submitting ? "Resetting..." : "Reset password"}
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
            Use a different phone number
          </button>
        </form>
      )}
      </>
      )}
    </AuthShell>
  );
}
