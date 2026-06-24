import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";

export type ApiAuditLog = {
  id: number;
  actor: string;
  role: string;
  action: string;
  action_label: string;
  target: string;
  target_id: string;
  reason: string;
  time: string;
  ip_address: string;
  user_agent: string;
  old_values: string;
  new_values: string;
};

// The screen filters/searches client-side over the full set, so we page through
// the server (each response stays bounded) and accumulate. Capped so a very
// large table can't load unbounded data into the browser.
const AUDIT_PAGE_SIZE = 200;
const MAX_AUDIT_ROWS = 5000;

export type AuditLogsResult = {
  logs: ApiAuditLog[];
  total: number;
  truncated: boolean;
};

export async function getAuditLogs(): Promise<AuditLogsResult> {
  const first = await apiRequest<PaginatedResponse<ApiAuditLog> | ApiAuditLog[]>(
    `/api/audit/admin/logs/?page=1&page_size=${AUDIT_PAGE_SIZE}`,
  );

  // Tolerate a non-paginated (array) response for back-compat.
  if (Array.isArray(first)) {
    return { logs: first, total: first.length, truncated: false };
  }

  const logs = [...first.results];
  let next = first.next;
  let page = 1;

  while (next && logs.length < MAX_AUDIT_ROWS) {
    page += 1;
    const res = await apiRequest<PaginatedResponse<ApiAuditLog>>(
      `/api/audit/admin/logs/?page=${page}&page_size=${AUDIT_PAGE_SIZE}`,
    );
    logs.push(...res.results);
    next = res.next;
  }

  return { logs, total: first.count, truncated: Boolean(next) };
}

export type AuditChainResult = {
  ok: boolean;
  count: number;
  broken_ids: number[];
};

export async function verifyAuditChain(): Promise<AuditChainResult> {
  return apiRequest<AuditChainResult>("/api/audit/admin/logs/verify/");
}
