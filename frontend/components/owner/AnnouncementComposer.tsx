"use client";

import { useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { DropdownFilter, type DropdownOption } from "@/components/ui/DropdownFilter";
import {
  broadcastNotification,
  getBroadcastAudiences,
  type BroadcastAudience,
} from "@/lib/api/notifications";

export function AnnouncementComposer() {
  const [audiences, setAudiences] = useState<BroadcastAudience[]>([]);
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    getBroadcastAudiences()
      .then((response) => {
        if (active) setAudiences(response.audiences);
      })
      .catch(() => {
        /* options fall back to a sensible default below */
      });
    return () => {
      active = false;
    };
  }, []);

  const options: DropdownOption[] = audiences.length
    ? audiences.map((item) => ({
        label: `${item.label} (${item.count})`,
        value: item.value,
      }))
    : [{ label: "Everyone", value: "all" }];

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      setError("Title and message are required.");
      setSuccess("");
      return;
    }
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const result = await broadcastNotification({
        title: title.trim(),
        message: message.trim(),
        audience,
      });
      setSuccess(result.detail);
      setTitle("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send announcement.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Send an announcement
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Broadcast a system notification (maintenance, changes, notices) to a group.
          </p>
        </div>
        <div className="w-full sm:w-56">
          <DropdownFilter
            label="Audience"
            options={options}
            selectedValue={audience}
            onChange={setAudience}
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={150}
          placeholder="Title — e.g. Scheduled maintenance"
          className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          placeholder="Message — e.g. The system will be unavailable from 2:00–3:00 AM for maintenance."
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        />

        {error ? (
          <div className="rounded-xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-2.5 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-2.5 text-sm text-[var(--badge-success-fg)]">
            {success}
          </div>
        ) : null}

        <div className="flex justify-end">
          <ActionButton onClick={handleSend} disabled={sending}>
            {sending ? "Sending…" : "Send Announcement"}
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
