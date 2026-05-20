"use client";

import { useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useUserApp } from "@/components/providers/UserAppProvider";
import { UserField, UserPageHeader, userInputClassName } from "@/components/user/UserPrimitives";

export function UserProfileScreen() {
  const { profile, updateProfile, updatePassword } = useUserApp();
  const [profileForm, setProfileForm] = useState({
    name: profile.name,
    phone: profile.phone,
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

  return (
    <div className="space-y-6">
      <UserPageHeader
        title="Profile"
        subtitle="Manage your account information."
      />

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Name", profile.name],
            ["Phone", profile.phone],
            ["Email", profile.email],
            ["Role", profile.role],
            ["Status", profile.status],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                {label}
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">{value}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
              Phone Verified
            </p>
            <div className="mt-2">
              <StatusBadge status={profile.phoneVerified ? "success" : "neutral"}>
                {profile.phoneVerified ? "Yes" : "No"}
              </StatusBadge>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
              Email Verified
            </p>
            <div className="mt-2">
              <StatusBadge status={profile.emailVerified ? "success" : "neutral"}>
                {profile.emailVerified ? "Yes" : "No"}
              </StatusBadge>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="grid gap-5 sm:grid-cols-2">
          <UserField label="Name">
            <input
              value={profileForm.name}
              onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
              className={userInputClassName}
            />
          </UserField>
          <UserField label="Phone">
            <input
              value={profileForm.phone}
              onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
              className={userInputClassName}
            />
          </UserField>
          <div className="sm:col-span-2">
            <UserField label="Email">
              <input
                value={profileForm.email}
                onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                className={userInputClassName}
              />
            </UserField>
          </div>
        </div>
        {profileMessage ? (
          <div className="mt-4 rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            {profileMessage}
          </div>
        ) : null}
        <div className="mt-5">
          <ActionButton
            onClick={() => {
              updateProfile(profileForm);
              setProfileMessage("Profile updated in local mock state.");
            }}
          >
            Save Profile
          </ActionButton>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Security</h2>
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
            <UserField label="Confirm Password">
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
            onClick={() => {
              const result = updatePassword(passwordForm);
              if (!result.ok) {
                setPasswordMessage("");
                setPasswordError(result.error ?? "Unable to update password.");
                return;
              }
              setPasswordError("");
              setPasswordMessage("Password updated in local mock state.");
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
    </div>
  );
}
