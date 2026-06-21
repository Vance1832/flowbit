"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { confirmPhoneVerification, requestPhoneVerification } from "@/lib/api/auth";
import { AvatarUploader } from "@/components/ui/AvatarUploader";
import { HeroPill, PageHero } from "@/components/ui/PageHero";
import { StatTile } from "@/components/ui/StatTile";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMmk, useUserApp } from "@/components/providers/UserAppProvider";
import { UserField, userInputClassName } from "@/components/user/UserPrimitives";

function toInitials(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function UserProfileScreen() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth();
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

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);

  async function startPhoneVerification() {
    setVerifyBusy(true);
    setVerifyError("");
    setVerifyMessage("");
    try {
      const result = await requestPhoneVerification();
      setVerifyOpen(true);
      setVerifyMessage(
        result.debug_code
          ? `Dev mode: your code is ${result.debug_code}`
          : "We sent a verification code to your phone.",
      );
    } catch {
      setVerifyError("Could not send a code. Please try again.");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function submitPhoneVerification() {
    if (!verifyCode.trim()) {
      setVerifyError("Enter the 6-digit code.");
      return;
    }
    setVerifyBusy(true);
    setVerifyError("");
    try {
      await confirmPhoneVerification(verifyCode.trim());
      await refreshUser(); // updates profile.phoneVerified + the progress bar
      setVerifyOpen(false);
      setVerifyCode("");
      setVerifyMessage("Phone verified.");
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : "Invalid or expired code.");
    } finally {
      setVerifyBusy(false);
    }
  }

  const verifiedCount = (profile.phoneVerified ? 1 : 0) + (profile.emailVerified ? 1 : 0);
  const verifiedPct = (verifiedCount / 2) * 100;

  return (
    <div className="space-y-6">
      {/* Identity hero — the page anchor, not a stack of equal cards. */}
      <PageHero>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <HeroPill>{profile.role}</HeroPill>
              <HeroPill>{profile.status}</HeroPill>
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
      </PageHero>

      {/* Wallet snapshot — gives the profile purpose in a wallet product. */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Available" value={formatMmk(availableBalance)} />
        <StatTile label="Locked" value={formatMmk(lockedBalance)} />
        <StatTile label="Pending In" value={formatMmk(pendingDeposit)} tone="positive" />
        <StatTile label="Pending Out" value={formatMmk(pendingWithdrawal)} tone="negative" />
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
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={profile.phoneVerified ? "success" : "neutral"}>
            {profile.phoneVerified ? "Phone verified" : "Phone unverified"}
          </StatusBadge>
          <StatusBadge status={profile.emailVerified ? "success" : "neutral"}>
            {profile.emailVerified ? "Email verified" : "Email unverified"}
          </StatusBadge>
          {!profile.phoneVerified && !verifyOpen ? (
            <button
              type="button"
              onClick={startPhoneVerification}
              disabled={verifyBusy}
              className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            >
              {verifyBusy ? "Sending…" : "Verify phone"}
            </button>
          ) : null}
        </div>

        {verifyOpen ? (
          <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Enter the code sent to <span className="font-medium text-[var(--color-foreground)]">{profile.phone}</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                inputMode="numeric"
                value={verifyCode}
                onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className="h-11 w-40 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              />
              <ActionButton onClick={submitPhoneVerification} disabled={verifyBusy}>
                {verifyBusy ? "Verifying…" : "Confirm"}
              </ActionButton>
              <ActionButton
                variant="secondary"
                onClick={() => {
                  setVerifyOpen(false);
                  setVerifyCode("");
                  setVerifyError("");
                }}
              >
                Cancel
              </ActionButton>
            </div>
          </div>
        ) : null}

        {verifyError ? (
          <p className="mt-3 text-sm font-medium text-[var(--color-danger)]">{verifyError}</p>
        ) : null}
        {verifyMessage ? (
          <p className="mt-3 text-sm font-medium text-[var(--color-success)]">{verifyMessage}</p>
        ) : null}
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
