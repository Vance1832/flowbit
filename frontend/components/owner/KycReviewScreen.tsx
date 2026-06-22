"use client";

import { useEffect, useMemo, useState } from "react";

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

const statusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "" },
];

export function KycReviewScreen() {
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
        if (active) setError("Unable to load KYC submissions.");
      });
    return () => {
      active = false;
    };
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
      setError(reviewError instanceof Error ? reviewError.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }

  const columns: TableColumn<ApiKycSubmission>[] = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        className: "whitespace-nowrap",
        render: (row) => <span className="font-medium">{row.user_name ?? `#${row.id}`}</span>,
      },
      { key: "phone", header: "Phone", className: "whitespace-nowrap", render: (row) => row.user_phone ?? "—" },
      { key: "doc", header: "Document", className: "whitespace-nowrap", render: (row) => row.document_type.toUpperCase() },
      { key: "number", header: "Number", className: "whitespace-nowrap", render: (row) => row.document_number },
      {
        key: "status",
        header: "Status",
        className: "whitespace-nowrap",
        render: (row) => <StatusBadge status={statusTone[row.status]}>{row.status}</StatusBadge>,
      },
      {
        key: "actions",
        header: "Actions",
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
            Review
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              KYC Review
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Identity submissions awaiting verification.
            </p>
          </div>
          <div className="w-44">
            <DropdownFilter
              label="Status"
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
          title="Submissions"
          rows={rows}
          columns={columns}
          tableClassName="min-w-[760px]"
        />
      </div>

      <DetailDrawer
        open={selected !== null}
        title="KYC Submission"
        subtitle={selected?.user_name}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["User", selected.user_name ?? "—"],
                ["Phone", selected.user_phone ?? "—"],
                ["Document Type", selected.document_type.toUpperCase()],
                ["Document Number", selected.document_number],
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
              alt="Submitted document"
              className="w-full rounded-2xl border border-[var(--color-border)]"
            />

            {selected.status === "pending" ? (
              <>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Review note (optional)"
                  rows={2}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                />
                <div className="flex gap-3">
                  <ActionButton onClick={() => review("approved")} disabled={busy}>
                    Approve
                  </ActionButton>
                  <ActionButton variant="danger" onClick={() => review("rejected")} disabled={busy}>
                    Reject
                  </ActionButton>
                </div>
              </>
            ) : (
              <StatusBadge status={statusTone[selected.status]}>{selected.status}</StatusBadge>
            )}
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
