"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { ActionButton } from "@/components/ui/ActionButton";

const inputClassName =
  "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:bg-white focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

export function LoginScreen() {
  const router = useRouter();
  const { getDefaultRoute, login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!phone.trim() || !password.trim()) {
      setError("Phone and password are required.");
      return;
    }

    setSubmitting(true);
    const result = await login(phone, password);
    if (!result.ok) {
      setError(result.error ?? "Login failed.");
      setSubmitting(false);
      return;
    }

    setError("");
    setSubmitting(false);
    router.push(getDefaultRoute(result.role));
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
          Sign in to your wallet, submit numbers, and track your results.
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
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
            placeholder="Enter your password"
            disabled={submitting}
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
          {submitting ? "Signing In..." : "Login"}
        </ActionButton>

        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          Authorized access only. Activity may be logged for security and audit purposes.
        </p>
      </form>
    </AuthShell>
  );
}
