"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import {
  mockDemoAccounts,
  mockDemoCredentials,
  useAuth,
} from "@/components/providers/AuthProvider";
import { ActionButton } from "@/components/ui/ActionButton";

const inputClassName =
  "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:bg-white focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

export function LoginScreen() {
  const router = useRouter();
  const { getDefaultRoute, login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = phone.trim();

    if (!phone.trim() || !password.trim()) {
      setError("Phone and password are required.");
      return;
    }

    const result = login(phone, password);
    if (!result.ok) {
      setError(result.error ?? "Login failed.");
      return;
    }

    setError("");
    const matchedAccount =
      mockDemoAccounts.find((account) => account.phone === normalizedPhone) ??
      mockDemoAccounts[0];
    const role = matchedAccount.label;
    router.push(getDefaultRoute(role));
  }

  function handleUseDemoCredentials(targetPhone = mockDemoCredentials.phone) {
    setPhone(targetPhone);
    setPassword(mockDemoCredentials.password);
    setError("");
  }

  return (
    <AuthShell
      footer={
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Need an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
          >
            Register
          </Link>
        </p>
      }
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Login
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          Secure internal access for wallet, result, and receipt operations.
        </p>
      </div>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClassName}
            placeholder="+95912345678"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Password
            </label>
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)]"
            >
              Forgot password
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
            placeholder="Enter your password"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

        <ActionButton type="submit" className="h-12 w-full rounded-2xl">
          Login
        </ActionButton>

        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          Authorized access only. Activity may be logged for security and audit purposes.
        </p>

        <div className="rounded-2xl bg-[var(--color-surface-subtle)] px-3.5 py-3 text-xs text-[var(--color-muted-foreground)]">
          <div className="flex flex-wrap items-center gap-3">
            {mockDemoAccounts.map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => handleUseDemoCredentials(account.phone)}
                className="font-medium text-[var(--color-primary)] underline-offset-4 transition hover:text-[var(--color-primary-strong)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                Use {account.label.toLowerCase()} demo
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {mockDemoAccounts.map((account) => (
              <p key={account.label}>
                {account.label}: {account.phone} / {account.password}
              </p>
            ))}
          </div>
        </div>
      </form>
    </AuthShell>
  );
}
