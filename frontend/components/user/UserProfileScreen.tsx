"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  confirmEmailVerification,
  confirmPhoneVerification,
  requestEmailVerification,
  requestPhoneVerification,
} from "@/lib/api/auth";
import { AvatarUploader } from "@/components/ui/AvatarUploader";
import { HeroPill, PageHero } from "@/components/ui/PageHero";
import { KycSection } from "@/components/user/KycSection";
import { ResponsibleGamblingSection } from "@/components/user/ResponsibleGamblingSection";
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
  const t = useTranslations();
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

  const [verifyTarget, setVerifyTarget] = useState<null | "phone" | "email">(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);

  async function startVerification(target: "phone" | "email") {
    setVerifyBusy(true);
    setVerifyError("");
    setVerifyMessage("");
    try {
      const result =
        target === "phone"
          ? await requestPhoneVerification()
          : await requestEmailVerification();
      setVerifyTarget(target);
      setVerifyCode("");
      setVerifyMessage(
        result.debug_code
          ? t("profile.devCode", { code: result.debug_code })
          : target === "phone"
            ? t("profile.codeSentPhone")
            : t("profile.codeSentEmail"),
      );
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : t("profile.couldNotSend"));
    } finally {
      setVerifyBusy(false);
    }
  }

  async function submitVerification() {
    if (!verifyTarget) return;
    if (!verifyCode.trim()) {
      setVerifyError(t("profile.enterCode"));
      return;
    }
    const target = verifyTarget;
    setVerifyBusy(true);
    setVerifyError("");
    try {
      if (target === "phone") {
        await confirmPhoneVerification(verifyCode.trim());
      } else {
        await confirmEmailVerification(verifyCode.trim());
      }
      await refreshUser(); // updates profile verified flags + the progress bar
      setVerifyTarget(null);
      setVerifyCode("");
      setVerifyMessage(target === "phone" ? t("profile.phoneVerifiedMsg") : t("profile.emailVerifiedMsg"));
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : t("profile.invalidCode"));
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
              {t("profile.availableBalance")}
            </p>
            <p className="mt-1 whitespace-nowrap text-2xl font-semibold tracking-tight">
              {formatMmk(availableBalance)}
            </p>
          </div>
        </div>
      </PageHero>

      {/* Wallet snapshot — gives the profile purpose in a wallet product. */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("profile.available")} value={formatMmk(availableBalance)} />
        <StatTile label={t("profile.locked")} value={formatMmk(lockedBalance)} />
        <StatTile label={t("profile.pendingIn")} value={formatMmk(pendingDeposit)} tone="positive" />
        <StatTile label={t("profile.pendingOut")} value={formatMmk(pendingWithdrawal)} tone="negative" />
      </section>

      {/* Verification as progress, not two Yes/No badges. */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            {t("profile.accountVerification")}
          </h2>
          <span className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {t("profile.verifyProgress", { count: verifiedCount })}
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
            {profile.phoneVerified ? t("profile.phoneVerified") : t("profile.phoneUnverified")}
          </StatusBadge>
          {!profile.phoneVerified && verifyTarget !== "phone" ? (
            <button
              type="button"
              onClick={() => startVerification("phone")}
              disabled={verifyBusy}
              className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            >
              {t("profile.verifyPhone")}
            </button>
          ) : null}

          <StatusBadge status={profile.emailVerified ? "success" : "neutral"}>
            {profile.emailVerified ? t("profile.emailVerified") : t("profile.emailUnverified")}
          </StatusBadge>
          {profile.email && !profile.emailVerified && verifyTarget !== "email" ? (
            <button
              type="button"
              onClick={() => startVerification("email")}
              disabled={verifyBusy}
              className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            >
              {t("profile.verifyEmail")}
            </button>
          ) : null}
        </div>

        {verifyTarget ? (
          <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {t("profile.enterCodeSent", {
                target: (verifyTarget === "phone" ? profile.phone : profile.email) ?? "",
              })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                inputMode="numeric"
                value={verifyCode}
                onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("profile.codePlaceholder")}
                className="h-11 w-40 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              />
              <ActionButton onClick={submitVerification} disabled={verifyBusy}>
                {verifyBusy ? t("profile.verifying") : t("profile.confirm")}
              </ActionButton>
              <ActionButton
                variant="secondary"
                onClick={() => {
                  setVerifyTarget(null);
                  setVerifyCode("");
                  setVerifyError("");
                }}
              >
                {t("profile.cancel")}
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

      <ResponsibleGamblingSection />

      <KycSection />

      {/* Photo + editable details, combined (no read-only/edit duplication). */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">{t("profile.profileDetails")}</h2>

        <div className="mt-4 border-b border-[var(--color-border)] pb-5">
          <AvatarUploader initials={toInitials(profile.name)} />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <UserField label={t("profile.fullName")}>
            <input
              value={profileForm.fullName}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, fullName: event.target.value }))
              }
              className={userInputClassName}
            />
          </UserField>
          <UserField label={t("profile.email")}>
            <input
              value={profileForm.email}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, email: event.target.value }))
              }
              className={userInputClassName}
            />
          </UserField>
          <div className="sm:col-span-2">
            <UserField label={t("profile.phoneSignIn")}>
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
                setProfileError(t("profile.nameEmailRequired"));
                return;
              }
              updateProfile({
                name: profileForm.fullName,
                phone: profile.phone,
                email: profileForm.email,
              });
              setProfileError("");
              setProfileMessage(t("profile.profileUpdated"));
            }}
          >
            {t("profile.saveChanges")}
          </ActionButton>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">{t("profile.security")}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {t("profile.securitySubtitle")}
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <UserField label={t("profile.currentPassword")}>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
              }
              className={userInputClassName}
            />
          </UserField>
          <UserField label={t("profile.newPassword")}>
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
            <UserField label={t("profile.confirmNewPassword")}>
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
                setPasswordError(t("profile.allFieldsRequired"));
                return;
              }
              if (passwordForm.newPassword.length < 8) {
                setPasswordMessage("");
                setPasswordError(t("profile.minPassword"));
                return;
              }
              const result = await updatePassword(passwordForm);
              if (!result.ok) {
                setPasswordMessage("");
                setPasswordError(result.error ?? t("profile.updatePasswordFailed"));
                return;
              }
              setPasswordError("");
              setPasswordMessage(t("profile.passwordUpdated"));
              setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
            }}
          >
            {t("profile.updatePassword")}
          </ActionButton>
        </div>
      </section>

      {/* Quiet destructive zone */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-5 py-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">{t("profile.signOut")}</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
            {t("profile.signOutHint")}
          </p>
        </div>
        <ActionButton
          variant="danger"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          {t("profile.logout")}
        </ActionButton>
      </section>
    </div>
  );
}
