"use client";

import { useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import {
  getSystemSettings,
  updateSystemSetting,
  type ApiSystemSetting,
} from "@/lib/api/settings";
import { ensureResults } from "@/lib/api/types";

const SETTING_META: Record<
  string,
  { label: string; hint: string }
> = {
  minimum_deposit: {
    label: "Minimum Deposit",
    hint: "Smallest amount (MMK) a user can request to deposit.",
  },
  minimum_withdrawal: {
    label: "Minimum Withdrawal",
    hint: "Smallest amount (MMK) a user can request to withdraw.",
  },
  default_settlement_rate: {
    label: "Default Settlement Rate",
    hint: "Default multiplier applied when creating a ledger.",
  },
  default_close_time: {
    label: "Default Close Time",
    hint: "Default closing time for result periods (HH:MM:SS).",
  },
  maintenance_mode: {
    label: "Maintenance Mode",
    hint: "Show a maintenance banner to everyone across the app.",
  },
  maintenance_message: {
    label: "Maintenance Message",
    hint: "Text shown in the maintenance banner.",
  },
};

function metaFor(key: string) {
  return (
    SETTING_META[key] ?? {
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      hint: "",
    }
  );
}

type RowState = { value: string; saving: boolean; status: "idle" | "saved" | "error"; message?: string };

export function SettingsScreen() {
  const [settings, setSettings] = useState<ApiSystemSetting[]>([]);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await getSystemSettings();
        if (!active) return;
        const list = ensureResults(response);
        setSettings(list);
        setRows(
          Object.fromEntries(
            list.map((item) => [
              item.id,
              { value: item.setting_value, saving: false, status: "idle" as const },
            ]),
          ),
        );
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load settings.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  function setRow(id: number, patch: Partial<RowState>) {
    setRows((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function handleSave(setting: ApiSystemSetting, explicitValue?: string) {
    const row = rows[setting.id];
    const value = (explicitValue ?? row?.value ?? "").trim();
    setRow(setting.id, { saving: true, status: "idle", message: undefined });
    try {
      const updated = await updateSystemSetting(setting.id, value);
      setSettings((current) =>
        current.map((item) => (item.id === setting.id ? updated : item)),
      );
      setRow(setting.id, {
        saving: false,
        status: "saved",
        value: updated.setting_value,
      });
    } catch (err) {
      setRow(setting.id, {
        saving: false,
        status: "error",
        message: err instanceof Error ? err.message : "Could not save.",
      });
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
          System Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Adjustable limits and defaults. Changes are recorded in the audit log.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          Loading settings…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {settings.map((setting) => {
            const meta = metaFor(setting.setting_key);
            const row = rows[setting.id];
            const dirty = row && row.value.trim() !== setting.setting_value;

            return (
              <div
                key={setting.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                      {meta.label}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                      {meta.hint}
                    </p>
                  </div>
                  <code className="rounded-lg bg-[var(--color-surface-muted)] px-2 py-1 text-[11px] text-[var(--color-muted-foreground)]">
                    {setting.setting_key}
                  </code>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {setting.setting_key === "maintenance_mode" ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row?.value === "true"}
                      disabled={row?.saving}
                      onClick={() =>
                        handleSave(
                          setting,
                          row?.value === "true" ? "false" : "true",
                        )
                      }
                      className={`relative h-7 w-12 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                        row?.value === "true"
                          ? "bg-[var(--color-primary)]"
                          : "bg-[var(--color-border-strong)]"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                          row?.value === "true" ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  ) : (
                    <input
                      value={row?.value ?? ""}
                      onChange={(event) =>
                        setRow(setting.id, { value: event.target.value, status: "idle" })
                      }
                      className="h-11 w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                    />
                  )}
                  {setting.setting_key !== "maintenance_mode" ? (
                    <ActionButton
                      className="h-11 rounded-xl px-5"
                      disabled={!dirty || row?.saving}
                      onClick={() => handleSave(setting)}
                    >
                      {row?.saving ? "Saving…" : "Save"}
                    </ActionButton>
                  ) : null}
                  {row?.status === "saved" ? (
                    <span className="text-sm font-medium text-[var(--color-success)]">
                      Saved
                    </span>
                  ) : null}
                  {row?.status === "error" ? (
                    <span className="text-sm font-medium text-[var(--color-danger)]">
                      {row.message}
                    </span>
                  ) : null}
                </div>

                {setting.updated_by_name ? (
                  <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                    Last updated by {setting.updated_by_name}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
