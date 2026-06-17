"use client";

import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { AvatarUploader } from "@/components/ui/AvatarUploader";
import { changePassword } from "@/lib/api/accounts";

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
  const { user } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
        Profile
      </h1>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          Profile Picture
        </h2>
        <div className="mt-4">
          <AvatarUploader initials={toInitials(user?.name)} />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          Account Information
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
