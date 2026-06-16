import { apiRequest } from "@/lib/api/client";

export type SystemStatus = {
  maintenance_mode: boolean;
  maintenance_message: string;
};

export async function getSystemStatus() {
  return apiRequest<SystemStatus>("/api/wallets/system-status/", {
    skipAuthRedirect: true,
  });
}
