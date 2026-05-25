"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  DropdownFilter,
  type DropdownOption,
} from "@/components/ui/DropdownFilter";

const inputClassName =
  "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:bg-white focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

const countryCodeOptions: DropdownOption[] = [
  { label: "+95 Myanmar", value: "+95" },
  { label: "+66 Thailand", value: "+66" },
  { label: "+65 Singapore", value: "+65" },
];

export function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+95");
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
      setError("Name, phone, password, and confirm password are required.");
      return;
    }

    if (!countryCode.startsWith("+")) {
      setSuccess("");
      setError("Country code must start with +.");
      return;
    }

    if (!/^\+\d{1,4}$/.test(countryCode.trim())) {
      setSuccess("");
      setError("Country code must be 1 to 4 digits after +.");
      return;
    }

    if (!/^\d+$/.test(phoneNumber.trim())) {
      setSuccess("");
      setError("Phone number must contain digits only.");
      return;
    }

    const normalizedPhoneNumber = phoneNumber.trim().replace(/\s+/g, "");
    const phoneDigits = normalizedPhoneNumber.startsWith("0")
      ? normalizedPhoneNumber.slice(1)
      : normalizedPhoneNumber;

    if (phoneDigits.length < 7 || phoneDigits.length > 12) {
      setSuccess("");
      setError("Phone number must be between 7 and 12 digits.");
      return;
    }

    if (password !== confirmPassword) {
      setSuccess("");
      setError("Password and confirm password must match.");
      return;
    }

    if (password.length < 8) {
      setSuccess("");
      setError("Password must be at least 8 characters.");
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
      setError(result.error ?? "Unable to create account.");
      setSubmitting(false);
      return;
    }

    setSuccess("Registration successful. Redirecting to login...");
    window.setTimeout(() => {
      router.push("/login");
    }, 900);
    setSubmitting(false);
  }

  return (
    <AuthShell
      footer={
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Register
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          Public registration creates a normal user account only.
        </p>
      </div>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            Name
          </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder="Enter your full name"
              disabled={submitting}
            />
        </div>

        <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Phone Country Code
            </label>
            <DropdownFilter
              label="Phone Country Code"
              options={countryCodeOptions}
              selectedValue={countryCode}
              onChange={setCountryCode}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Phone Number
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
            Email <span className="text-[var(--color-muted-foreground)]">(optional)</span>
          </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClassName}
              placeholder="name@example.com"
              disabled={submitting}
            />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
              placeholder="Create password"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
              placeholder="Confirm password"
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
          {submitting ? "Creating Account..." : "Create Account"}
        </ActionButton>
      </form>
    </AuthShell>
  );
}
