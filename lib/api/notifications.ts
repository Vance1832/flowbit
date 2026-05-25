import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";

export type ApiNotification = {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  reference_table: string | null;
  reference_id: number | null;
  created_at: string;
  read_at: string | null;
};

export async function getNotifications() {
  return apiRequest<PaginatedResponse<ApiNotification> | ApiNotification[]>(
    "/api/notifications/",
  );
}

export async function markNotificationRead(id: number) {
  return apiRequest<ApiNotification>(`/api/notifications/${id}/read/`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead() {
  return apiRequest<{ detail: string }>("/api/notifications/read-all/", {
    method: "POST",
  });
}
