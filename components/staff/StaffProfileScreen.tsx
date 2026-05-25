"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { useStaffApp } from "@/components/providers/StaffAppProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { UserField, UserPageHeader, userInputClassName } from "@/components/user/UserPrimitives";

export function StaffProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { profile, updatePassword, updateProfile } = useStaffApp();
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
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  return (
    <div className="space-y-6">
      <UserPageHeader title="Profile" />

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          Account Information
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="grid gap-5 sm:grid-cols-2">
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

              updateProfile({ name: profileForm.fullName, email: profileForm.email });
              setProfileError("");
              setProfileMessage("Profile updated successfully.");
            }}
          >
            Save Profile
          </ActionButton>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Change Password</h2>
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
            onClick={() => {
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
              if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                setPasswordMessage("");
                setPasswordError("New password and confirm password must match.");
                return;
              }
              updatePassword();
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

      <section>
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
