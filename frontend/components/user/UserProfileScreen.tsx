"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { AvatarUploader } from "@/components/ui/AvatarUploader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMmk, useUserApp } from "@/components/providers/UserAppProvider";
import { UserField, userInputClassName } from "@/components/user/UserPrimitives";

function toInitials(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

function WalletTile({ label, value, tone = "default" }: {
  label: string;
  value: string;
  tone?: "default" | "locked" | "in" | "out";
}) {
  const accent =
    tone === "in"
      ? "text-[var(--color-success)]"
      : tone === "out"
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-foreground)]";
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3.5">
      <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">{label}</p>
      <p className={`mt-1.5 whitespace-nowrap text-base font-semibold tracking-tight ${accent}`}>
        {value}
      </p>
    </div>
  );
}

export function UserProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const {
    profile,
    availableBalance,
    lockedBalance,
    pendingDeposit,
    pendingWithdrawal,
    updateProfile,
    updatePassword,
  } = useUserApp();

  const [profileForm, setProfileForm] = useState({
    fullName: profile.name,
    email: profile.email,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileError, setProfileError] = useState("");

  const verifiedCount = (profile.phoneVerified ? 1 : 0) + (profile.emailVerified ? 1 : 0);
  const verifiedPct = (verifiedCount / 2) * 100;

  return (
    <div className="space-y-6">
      {/* Identity hero — the page anchor, not a stack of equal cards. */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-strong)] to-[var(--color-accent)] p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                {profile.role}
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
                {profile.status}
              </span>
            </div>
            <h1 className="mt-3 truncate text-2xl font-semibold tracking-tight">{profile.name}</h1>
            <p className="mt-1 text-sm text-white/80">{profile.phone}</p>
          </div>

          <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/75">
              Available Balance
            </p>
            <p className="mt-1 whitespace-nowrap text-2xl font-semibold tracking-tight">
              {formatMmk(availableBalance)}
            </p>
          </div>
        </div>
      </section>

      {/* Wallet snapshot — gives the profile purpose in a wallet product. */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <WalletTile label="Available" value={formatMmk(availableBalance)} />
        <WalletTile label="Locked" value={formatMmk(lockedBalance)} tone="locked" />
        <WalletTile label="Pending In" value={formatMmk(pendingDeposit)} tone="in" />
        <WalletTile label="Pending Out" value={formatMmk(pendingWithdrawal)} tone="out" />
      </section>

      {/* Verification as progress, not two Yes/No badges. */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Account verification
          </h2>
          <span className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {verifiedCount} of 2 complete
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500"
            style={{ width: `${verifiedPct}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge status={profile.phoneVerified ? "success" : "neutral"}>
            {profile.phoneVerified ? "Phone verified" : "Phone unverified"}
          </StatusBadge>
          <StatusBadge status={profile.emailVerified ? "success" : "neutral"}>
            {profile.emailVerified ? "Email verified" : "Email unverified"}
          </StatusBadge>
        </div>
      </section>

      {/* Photo + editable details, combined (no read-only/edit duplication). */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Profile details</h2>

        <div className="mt-4 border-b border-[var(--color-border)] pb-5">
          <AvatarUploader initials={toInitials(profile.name)} />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <UserField label="Full Name">
            <input
              value={profileForm.fullName}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, fullName: event.target.value }))
              }
              className={userInputClassName}
            />
          </UserField>
          <UserField label="Email">
            <input
              value={profileForm.email}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, email: event.target.value }))
              }
              className={userInputClassName}
            />
          </UserField>
          <div className="sm:col-span-2">
            <UserField label="Phone (sign-in ID)">
              <input
                value={profile.phone}
                readOnly
                className={`${userInputClassName} cursor-not-allowed opacity-70`}
              />
            </UserField>
          </div>
        </div>

        {profileError ? (
          <div className="mt-4 rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {profileError}
          </div>
        ) : null}
        {profileMessage ? (
          <div className="mt-4 rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            {profileMessage}
          </div>
        ) : null}

        <div className="mt-5">
          <ActionButton
            onClick={() => {
              if (!profileForm.fullName.trim() || !profileForm.email.trim()) {
                setProfileMessage("");
                setProfileError("Full name and email are required.");
                return;
              }
              updateProfile({
                name: profileForm.fullName,
                phone: profile.phone,
                email: profileForm.email,
              });
              setProfileError("");
              setProfileMessage("Profile updated successfully.");
            }}
          >
            Save Changes
          </ActionButton>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Security</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Change the password you use to sign in.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <UserField label="Current Password">
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
              }
              className={userInputClassName}
            />
          </UserField>
          <UserField label="New Password">
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
              }
              className={userInputClassName}
            />
          </UserField>
          <div className="sm:col-span-2">
            <UserField label="Confirm New Password">
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                }
                className={userInputClassName}
              />
            </UserField>
          </div>
        </div>
        {passwordError ? (
          <div className="mt-4 rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {passwordError}
          </div>
        ) : null}
        {passwordMessage ? (
          <div className="mt-4 rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            {passwordMessage}
          </div>
        ) : null}
        <div className="mt-5">
          <ActionButton
            onClick={async () => {
              if (
                !passwordForm.currentPassword ||
                !passwordForm.newPassword ||
                !passwordForm.confirmPassword
              ) {
                setPasswordMessage("");
                setPasswordError("All fields required.");
                return;
              }
              if (passwordForm.newPassword.length < 8) {
                setPasswordMessage("");
                setPasswordError("Minimum password length 8 characters.");
                return;
              }
              const result = await updatePassword(passwordForm);
              if (!result.ok) {
                setPasswordMessage("");
                setPasswordError(result.error ?? "Unable to update password.");
                return;
              }
              setPasswordError("");
              setPasswordMessage("Password updated successfully.");
              setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
            }}
          >
            Update Password
          </ActionButton>
        </div>
      </section>

      {/* Quiet destructive zone */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-5 py-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sign out</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
            For role changes or account problems, contact Flowbit support.
          </p>
        </div>
        <ActionButton
          variant="danger"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          Logout
        </ActionButton>
      </section>
    </div>
  );
}
