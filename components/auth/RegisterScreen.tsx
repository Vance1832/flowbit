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
  "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:bg-white focus-visible:ring-2 focus-visible:ring-emerald-700/30";

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !phoneNumber.trim() || !password.trim() || !confirmPassword.trim()) {
      setSuccess("");
      setError("Name, phone, password, and confirm password are required.");
      return;
    }

    if (password !== confirmPassword) {
      setSuccess("");
      setError("Password and confirm password must match.");
      return;
    }

    setError("");
    register();
    setSuccess("Registration successful. Redirecting to login...");
    window.setTimeout(() => {
      router.push("/login");
    }, 900);
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
              placeholder="9 123 456 789"
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

        <ActionButton type="submit" className="h-12 w-full rounded-2xl">
          Create Account
        </ActionButton>
      </form>
    </AuthShell>
  );
}
