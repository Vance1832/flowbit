"use client";

import { useEffect, useState } from "react";

import { getSystemStatus, type SystemStatus } from "@/lib/api/system";

export function MaintenanceBanner() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getSystemStatus();
        if (active) setStatus(result);
      } catch {
        // status is best-effort; ignore failures
      }
    }

    void load();
    // Re-check periodically so the banner clears/appears without a full reload.
    const timer = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!status?.maintenance_mode) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-[var(--badge-warning-ring)] bg-[var(--badge-warning-bg)] px-4 py-2.5 text-center text-sm font-medium text-[var(--badge-warning-fg)]"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
        <path
          d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        {status.maintenance_message || "The system is under maintenance."}
      </span>
    </div>
  );
}
