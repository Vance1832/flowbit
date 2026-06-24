"use client";

import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { AvatarUploader } from "@/components/ui/AvatarUploader";
import { HeroPill, PageHero } from "@/components/ui/PageHero";
import { changePassword } from "@/lib/api/accounts";
import { setTwoFactor } from "@/lib/api/auth";

function toInitials(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "OP";
  const parts = trimmed.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "OP";
}

const inputClassName =
  "h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

function roleLabel(role?: string | null) {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    default:
      return role ?? "—";
  }
}

export function OwnerProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");

  async function handleToggleTwoFactor() {
    setTwoFactorError("");
    setTwoFactorBusy(true);
    try {
      await setTwoFactor(!user?.two_factor_enabled);
      await refreshUser();
    } catch (err) {
      setTwoFactorError(
        err instanceof Error ? err.message : "Unable to update two-factor setting.",
      );
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function handleChangePassword() {
    setMessage("");
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("All password fields are required.");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("Minimum password length is 8 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password must match.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await changePassword({
        current_password: form.currentPassword,
        new_password: form.newPassword,
        confirm_password: form.confirmPassword,
      });
      setMessage("Password changed successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setSaving(false);
    }
  }

  const info: [string, string][] = [
    ["Name", user?.name ?? "—"],
    ["Phone", user?.phone ?? "—"],
    ["Email", user?.email ?? "—"],
    ["Role", roleLabel(user?.role)],
  ];

  return (
    <div className="max-w-[900px] space-y-5">
      <PageHero>
        <div className="flex flex-wrap items-center gap-2">
          <HeroPill>{roleLabel(user?.role)}</HeroPill>
          {user?.status ? (
            <HeroPill>{user.status[0].toUpperCase() + user.status.slice(1)}</HeroPill>
          ) : null}
        </div>
        <h1 className="mt-3 truncate text-2xl font-semibold tracking-tight">
          {user?.name ?? "—"}
        </h1>
        <p className="mt-1 text-sm text-white/80">{user?.phone ?? "—"}</p>
      </PageHero>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Profile details</h2>
        <div className="mt-4 border-b border-[var(--color-border)] pb-5">
          <AvatarUploader initials={toInitials(user?.name)} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {info.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                {label}
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          Two-factor authentication
        </h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--color-muted-foreground)]">
          Require a one-time code (sent to your registered phone/email) in
          addition to your password each time you sign in.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              user?.two_factor_enabled
                ? "bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]"
                : "bg-[var(--color-surface-subtle)] text-[var(--color-muted-foreground)]"
            }`}
          >
            {user?.two_factor_enabled ? "Enabled" : "Disabled"}
          </span>
          <ActionButton
            variant={user?.two_factor_enabled ? "secondary" : "primary"}
            onClick={handleToggleTwoFactor}
            disabled={twoFactorBusy}
          >
            {twoFactorBusy
              ? "Saving…"
              : user?.two_factor_enabled
                ? "Disable two-factor"
                : "Enable two-factor"}
          </ActionButton>
        </div>
        {twoFactorError ? (
          <p className="mt-3 text-sm font-medium text-[var(--color-danger)]">
            {twoFactorError}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          Change Password
        </h2>
        <div className="mt-4 grid max-w-md gap-3">
          <input
            type="password"
            placeholder="Current password"
            value={form.currentPassword}
            onChange={(e) => setForm((c) => ({ ...c, currentPassword: e.target.value }))}
            className={inputClassName}
          />
          <input
            type="password"
            placeholder="New password"
            value={form.newPassword}
            onChange={(e) => setForm((c) => ({ ...c, newPassword: e.target.value }))}
            className={inputClassName}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={form.confirmPassword}
            onChange={(e) => setForm((c) => ({ ...c, confirmPassword: e.target.value }))}
            className={inputClassName}
          />
          {error ? (
            <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>
          ) : null}
          {message ? (
            <p className="text-sm font-medium text-[var(--color-success)]">{message}</p>
          ) : null}
          <div>
            <ActionButton onClick={handleChangePassword} disabled={saving}>
              {saving ? "Saving…" : "Update Password"}
            </ActionButton>
          </div>
        </div>
      </section>
    </div>
  );
}
