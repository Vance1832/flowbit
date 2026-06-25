"use client";

import { useEffect, useRef } from "react";

import { getUnreadCount } from "@/lib/api/notifications";

/**
 * Polls the lightweight unread-count endpoint so new notifications surface
 * without a manual reload. Fires `onChange(count)` only when the server count
 * differs from the previous poll, so the caller refetches the full list just
 * when something actually changed. Polling pauses while the tab is hidden and
 * resumes (with an immediate check) when it becomes visible again.
 */
export function useUnreadPoll(
  onChange: (unread: number) => void,
  { intervalMs = 20_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {},
) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // null until the first successful poll seeds it — the seed never fires
  // onChange, so the caller's initial load isn't duplicated.
  const lastCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    async function poll() {
      if (!active || document.hidden) return;
      try {
        const { unread } = await getUnreadCount();
        if (!active) return;
        if (lastCountRef.current !== null && unread !== lastCountRef.current) {
          onChangeRef.current(unread);
        }
        lastCountRef.current = unread;
      } catch {
        // best-effort; a failed poll just retries on the next tick
      }
    }

    const timer = window.setInterval(poll, intervalMs);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, enabled]);
}
