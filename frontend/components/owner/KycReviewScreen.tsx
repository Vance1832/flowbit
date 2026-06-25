"use client";

import { useEffect, useMemo, useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getAdminKyc, reviewKyc, type ApiKycSubmission } from "@/lib/api/compliance";
import { ensureResults } from "@/lib/api/types";
import type { StatusTone, TableColumn } from "@/lib/types";

const statusTone: Record<string, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const STATUS_KEY: Record<string, string> = {
  pending: "kyc.statusPending",
  approved: "kyc.statusApproved",
  rejected: "kyc.statusRejected",
};

export function KycReviewScreen() {
  const t = useTranslations();
  const statusLabel = (status: string) =>
    STATUS_KEY[status] ? t(STATUS_KEY[status]) : status;
  const statusOptions = [
    { label: t("kyc.statusPending"), value: "pending" },
    { label: t("kyc.statusApproved"), value: "approved" },
    { label: t("kyc.statusRejected"), value: "rejected" },
    { label: t("kycReview.statusAll"), value: "" },
  ];

  const [rows, setRows] = useState<ApiKycSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<ApiKycSubmission | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    getAdminKyc(statusFilter || undefined)
      .then((response) => {
        if (!active) return;
        setRows(ensureResults(response));
        setError("");
      })
      .catch(() => {
        if (active) setError(t("kycReview.loadError"));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, refreshKey]);

  async function review(status: "approved" | "rejected") {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await reviewKyc(selected.id, status, note.trim() || undefined);
      setSelected(null);
      setNote("");
      setRefreshKey((key) => key + 1);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : t("kycReview.reviewFailed"));
    } finally {
      setBusy(false);
    }
  }

  const columns: TableColumn<ApiKycSubmission>[] = useMemo(
    () => [
      {
        key: "user",
        header: t("kycReview.colUser"),
        className: "whitespace-nowrap",
        render: (row) => <span className="font-medium">{row.user_name ?? `#${row.id}`}</span>,
      },
      { key: "phone", header: t("kycReview.colPhone"), className: "whitespace-nowrap", render: (row) => row.user_phone ?? "—" },
      { key: "doc", header: t("kycReview.colDocument"), className: "whitespace-nowrap", render: (row) => row.document_type.toUpperCase() },
      { key: "number", header: t("kycReview.colNumber"), className: "whitespace-nowrap", render: (row) => row.document_number },
      {
        key: "status",
        header: t("common.status"),
        className: "whitespace-nowrap",
        render: (row) => <StatusBadge status={statusTone[row.status]}>{statusLabel(row.status)}</StatusBadge>,
      },
      {
        key: "actions",
        header: t("dep.colActions"),
        className: "whitespace-nowrap",
        render: (row) => (
          <button
            type="button"
            onClick={() => {
              setSelected(row);
              setNote("");
            }}
            className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          >
            {t("kycReview.review")}
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              {t("kycReview.title")}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {t("kycReview.subtitle")}
            </p>
          </div>
          <div className="w-44">
            <DropdownFilter
              label={t("common.status")}
              options={statusOptions}
              selectedValue={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

        <DataTable
          title={t("kycReview.submissionsTitle")}
          rows={rows}
          columns={columns}
          tableClassName="min-w-[760px]"
        />
      </div>

      <DetailDrawer
        open={selected !== null}
        title={t("kycReview.drawerTitle")}
        subtitle={selected?.user_name}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [t("kycReview.colUser"), selected.user_name ?? "—"],
                [t("kycReview.colPhone"), selected.user_phone ?? "—"],
                [t("kycReview.detailDocType"), selected.document_type.toUpperCase()],
                [t("kycReview.detailDocNumber"), selected.document_number],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">{value}</p>
                </div>
              ))}
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.document_image}
              alt={t("kycReview.docAlt")}
              className="w-full rounded-2xl border border-[var(--color-border)]"
            />

            {selected.status === "pending" ? (
              <>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("kycReview.notePlaceholder")}
                  rows={2}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                />
                <div className="flex gap-3">
                  <ActionButton onClick={() => review("approved")} disabled={busy}>
                    {t("kycReview.approve")}
                  </ActionButton>
                  <ActionButton variant="danger" onClick={() => review("rejected")} disabled={busy}>
                    {t("kycReview.reject")}
                  </ActionButton>
                </div>
              </>
            ) : (
              <StatusBadge status={statusTone[selected.status]}>{statusLabel(selected.status)}</StatusBadge>
            )}
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
