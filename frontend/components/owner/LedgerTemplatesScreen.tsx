"use client";

import { useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  buildLedgersFromTemplate,
  createLedgerTemplate,
  deleteLedgerTemplate,
  getAdminResultPeriods,
  getLedgerTemplates,
  type ApiLedgerTemplate,
  type ApiResultPeriod,
} from "@/lib/api/ledgers";
import { ensureResults } from "@/lib/api/types";

const inputClassName =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";

type DraftTier = { name: string; capacity_per_number: string; settlement_rate: string };

function newTier(): DraftTier {
  return { name: "", capacity_per_number: "", settlement_rate: "700" };
}

export function LedgerTemplatesScreen() {
  const [templates, setTemplates] = useState<ApiLedgerTemplate[]>([]);
  const [periods, setPeriods] = useState<ApiResultPeriod[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [tiers, setTiers] = useState<DraftTier[]>([newTier()]);

  const [periodId, setPeriodId] = useState("");
  const [templateId, setTemplateId] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getLedgerTemplates(), getAdminResultPeriods()])
      .then(([templateResponse, periodResponse]) => {
        if (!active) return;
        setTemplates(ensureResults(templateResponse));
        setPeriods(ensureResults(periodResponse));
        setError("");
      })
      .catch(() => {
        if (active) setError("Unable to load templates.");
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const periodOptions = useMemo(
    () =>
      periods.map((period) => ({
        label: `${period.code} — ${period.status}`,
        value: String(period.id),
      })),
    [periods],
  );
  const templateOptions = useMemo(
    () => templates.map((template) => ({ label: template.name, value: String(template.id) })),
    [templates],
  );

  function setTier(index: number, patch: Partial<DraftTier>) {
    setTiers((current) => current.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }

  async function saveTemplate() {
    if (!name.trim()) return setError("Template name is required.");
    const cleaned = tiers.filter((tier) => tier.name.trim() && tier.capacity_per_number.trim());
    if (cleaned.length === 0) return setError("Add at least one tier (name + capacity).");

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await createLedgerTemplate({
        name: name.trim(),
        tiers: cleaned.map((tier, index) => ({
          name: tier.name.trim(),
          capacity_per_number: tier.capacity_per_number,
          settlement_rate: tier.settlement_rate || "700",
          priority_order: index + 1,
        })),
      });
      setName("");
      setTiers([newTier()]);
      setMessage("Template saved.");
      setRefreshKey((key) => key + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save template.");
    } finally {
      setBusy(false);
    }
  }

  async function removeTemplate(id: number) {
    setBusy(true);
    setError("");
    try {
      await deleteLedgerTemplate(id);
      setRefreshKey((key) => key + 1);
    } catch {
      setError("Could not delete template.");
    } finally {
      setBusy(false);
    }
  }

  async function build() {
    if (!periodId || !templateId) return setError("Pick a period and a template.");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await buildLedgersFromTemplate(Number(periodId), Number(templateId));
      setMessage(result.detail);
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : "Build failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
          Ledger Templates
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Save a set of ledger tiers once, then build them onto any result period in one click.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
          {message}
        </div>
      ) : null}

      {/* Build onto a period */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Build ledgers</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <p className="mb-1.5 text-sm font-medium text-[var(--color-foreground)]">Result period</p>
            <DropdownFilter label="Period" options={periodOptions} selectedValue={periodId} onChange={setPeriodId} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-[var(--color-foreground)]">Template</p>
            <DropdownFilter label="Template" options={templateOptions} selectedValue={templateId} onChange={setTemplateId} />
          </div>
          <ActionButton onClick={build} disabled={busy}>
            Build ledgers
          </ActionButton>
        </div>
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          Open/close times are set from the period (open now → close at its date + close time).
        </p>
      </section>

      {/* Create a template */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">New template</h2>
        <div className="mt-4 max-w-sm">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClassName}
            placeholder="Template name (e.g. Standard)"
          />
        </div>

        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-muted-foreground)]">
            <span>Ledger name</span>
            <span>Capacity / number</span>
            <span>Settlement rate</span>
            <span />
          </div>
          {tiers.map((tier, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <input
                value={tier.name}
                onChange={(event) => setTier(index, { name: event.target.value })}
                className={inputClassName}
                placeholder={index === 0 ? "Primary" : "Overflow"}
              />
              <input
                value={tier.capacity_per_number}
                onChange={(event) => setTier(index, { capacity_per_number: event.target.value.replace(/[^\d.]/g, "") })}
                className={inputClassName}
                placeholder="100000"
              />
              <input
                value={tier.settlement_rate}
                onChange={(event) => setTier(index, { settlement_rate: event.target.value.replace(/[^\d.]/g, "") })}
                className={inputClassName}
                placeholder="700"
              />
              <button
                type="button"
                onClick={() => setTiers((current) => current.filter((_, i) => i !== index))}
                disabled={tiers.length === 1}
                className="px-2 text-sm font-semibold text-[var(--color-danger)] disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <ActionButton variant="secondary" onClick={() => setTiers((current) => [...current, newTier()])}>
            Add tier
          </ActionButton>
          <ActionButton onClick={saveTemplate} disabled={busy}>
            Save Template
          </ActionButton>
        </div>
      </section>

      {/* Existing templates */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Saved templates</h2>
        {templates.length === 0 ? (
          <EmptyState title="No templates yet" description="Create one above to reuse across periods." />
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[var(--color-foreground)]">{template.name}</p>
                <button
                  type="button"
                  onClick={() => removeTemplate(template.id)}
                  className="text-sm font-semibold text-[var(--color-danger)] hover:opacity-80"
                >
                  Delete
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {template.tiers.map((tier) => (
                  <StatusBadge key={tier.id ?? tier.name} status="neutral">
                    {`${tier.priority_order}. ${tier.name} · cap ${Number(tier.capacity_per_number).toLocaleString()} · ${Number(tier.settlement_rate)}×`}
                  </StatusBadge>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
