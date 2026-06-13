import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";

export type ApiSystemSetting = {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_by_name: string | null;
  updated_at: string;
};

export async function getSystemSettings() {
  return apiRequest<PaginatedResponse<ApiSystemSetting> | ApiSystemSetting[]>(
    "/api/wallets/admin/settings/",
  );
}

export async function updateSystemSetting(id: number, settingValue: string) {
  return apiRequest<ApiSystemSetting>(`/api/wallets/admin/settings/${id}/`, {
    method: "PATCH",
    body: { setting_value: settingValue },
  });
}
