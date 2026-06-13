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

export async function getAuditLogs() {
  return apiRequest<PaginatedResponse<ApiAuditLog> | ApiAuditLog[]>(
    "/api/audit/admin/logs/",
  );
}
