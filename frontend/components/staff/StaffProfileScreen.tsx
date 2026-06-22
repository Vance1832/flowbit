"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { useStaffApp } from "@/components/providers/StaffAppProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { AvatarUploader } from "@/components/ui/AvatarUploader";
import { HeroPill, PageHero } from "@/components/ui/PageHero";
import { UserField, userInputClassName } from "@/components/user/UserPrimitives";

function toInitials(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "ST";
  const parts = trimmed.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "ST";
}

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
      <PageHero>
        <div className="flex flex-wrap items-center gap-2">
          <HeroPill>{profile.role}</HeroPill>
          <HeroPill>{profile.status}</HeroPill>
        </div>
        <h1 className="mt-3 truncate text-2xl font-semibold tracking-tight">{profile.name}</h1>
        <p className="mt-1 text-sm text-white/80">{profile.phone}</p>
      </PageHero>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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

              updateProfile({ name: profileForm.fullName, email: profileForm.email });
              setProfileError("");
              setProfileMessage("Profile updated successfully.");
            }}
          >
            Save Profile
          </ActionButton>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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
              if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                setPasswordMessage("");
                setPasswordError("New password and confirm password must match.");
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

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-5 py-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sign out</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
            End your session on this device.
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
