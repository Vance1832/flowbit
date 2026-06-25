"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserField, userInputClassName } from "@/components/user/UserPrimitives";
import { getMyKyc, submitKyc, type ApiKycSubmission } from "@/lib/api/compliance";
import { ensureResults } from "@/lib/api/types";

const STATUS_TONE = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
} as const;

const STATUS_LABEL_KEY = {
  approved: "kyc.statusApproved",
  pending: "kyc.statusPending",
  rejected: "kyc.statusRejected",
} as const;

export function KycSection() {
  const t = useTranslations();
  const documentTypes = [
    { value: "nrc", label: t("kyc.nrc") },
    { value: "passport", label: t("kyc.passport") },
    { value: "driver_license", label: t("kyc.driverLicense") },
  ];
  const [latest, setLatest] = useState<ApiKycSubmission | null>(null);
  const [docType, setDocType] = useState("nrc");
  const [docNumber, setDocNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getMyKyc()
      .then((response) => {
        if (active) setLatest(ensureResults(response)[0] ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refreshKey]);

  async function handleSubmit() {
    if (!docNumber.trim() || !file) {
      setError(t("kyc.docRequired"));
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await submitKyc({ document_type: docType, document_number: docNumber.trim(), document_image: file });
      setDocNumber("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setMessage(t("kyc.submitted"));
      setRefreshKey((key) => key + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("kyc.submitFailed"));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !latest || latest.status === "rejected";

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          {t("kyc.title")}
        </h2>
        {latest ? (
          <StatusBadge status={STATUS_TONE[latest.status]}>
            {t(STATUS_LABEL_KEY[latest.status])}
          </StatusBadge>
        ) : null}
      </div>

      {latest?.status === "approved" ? (
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          {t("kyc.verified")}
        </p>
      ) : latest?.status === "pending" ? (
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          {t("kyc.underReview")}
        </p>
      ) : (
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          {latest?.status === "rejected"
            ? t("kyc.rejected", { note: latest.review_note ? `: ${latest.review_note}` : "" })
            : t("kyc.prompt")}
        </p>
      )}

      {canSubmit ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <UserField label={t("kyc.docType")}>
            <select
              value={docType}
              onChange={(event) => setDocType(event.target.value)}
              className={userInputClassName}
              disabled={busy}
            >
              {documentTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </UserField>
          <UserField label={t("kyc.docNumber")}>
            <input
              value={docNumber}
              onChange={(event) => setDocNumber(event.target.value)}
              className={userInputClassName}
              placeholder={t("kyc.docNumberPlaceholder")}
              disabled={busy}
            />
          </UserField>
          <div className="sm:col-span-2">
            <UserField label={t("kyc.docImage")}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-[var(--color-muted-foreground)] file:mr-3 file:rounded-xl file:border file:border-[var(--color-border-strong)] file:bg-[var(--color-surface-raised)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-foreground)]"
                disabled={busy}
              />
            </UserField>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-medium text-[var(--color-danger)]">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm font-medium text-[var(--color-success)]">{message}</p>
      ) : null}

      {canSubmit ? (
        <div className="mt-4">
          <ActionButton onClick={handleSubmit} disabled={busy}>
            {busy ? t("kyc.submitting") : t("kyc.submitButton")}
          </ActionButton>
        </div>
      ) : null}
    </section>
  );
}
