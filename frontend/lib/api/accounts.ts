import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";
import { getCurrentUserRequest, type CurrentUser } from "@/lib/api/auth";

export type AccountMe = CurrentUser;

export type ApiRegisterInput = {
  name: string;
  phone_country_code: string;
  phone_number: string;
  email?: string;
  password: string;
  confirm_password: string;
};

export type ApiManagedUserRole = "owner" | "admin" | "staff" | "user" | "vip_user";
export type ApiManagedUserStatus = "active" | "deactivated" | "suspended";

export type ApiManagedUser = {
  id: number;
  name: string;
  phone_country_code: string;
  phone_number: string;
  phone: string;
  email: string | null;
  role: ApiManagedUserRole;
  status: ApiManagedUserStatus;
  phone_verified: boolean;
  email_verified: boolean;
  created_at: string;
};

export async function getMyAccount() {
  return getCurrentUserRequest();
}

export async function registerAccount(input: ApiRegisterInput) {
  return apiRequest<{
    id: number;
    name: string;
    phone_country_code: string;
    phone_number: string;
    phone: string;
    email: string | null;
  }>("/api/accounts/register/", {
    method: "POST",
    body: input,
  });
}

export async function changePassword(input: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}) {
  return apiRequest<{ detail: string }>("/api/accounts/change-password/", {
    method: "POST",
    body: input,
  });
}

export async function getManagedUsers() {
  return apiRequest<PaginatedResponse<ApiManagedUser> | ApiManagedUser[]>(
    "/api/accounts/admin/users/",
  );
}

export async function createManagedUser(input: {
  name: string;
  phone_country_code: string;
  phone_number: string;
  email?: string;
  role: Exclude<ApiManagedUserRole, "owner" | "vip_user">;
  status: Extract<ApiManagedUserStatus, "active" | "deactivated">;
  password: string;
  confirm_password: string;
}) {
  return apiRequest<ApiManagedUser>("/api/accounts/admin/users/", {
    method: "POST",
    body: input,
  });
}

export async function updateManagedUser(
  id: number,
  input: Partial<{
    name: string;
    phone_country_code: string;
    phone_number: string;
    email: string | null;
    role: Exclude<ApiManagedUserRole, "owner" | "vip_user">;
    status: Extract<ApiManagedUserStatus, "active" | "deactivated">;
  }>,
) {
  return apiRequest<ApiManagedUser>(`/api/accounts/admin/users/${id}/`, {
    method: "PATCH",
    body: input,
  });
}

export async function resetManagedUserPassword(
  id: number,
  input: { new_password: string; confirm_password: string },
) {
  return apiRequest<{ detail: string }>(`/api/accounts/admin/users/${id}/reset-password/`, {
    method: "POST",
    body: input,
  });
}

export async function deactivateManagedUser(id: number) {
  return apiRequest<ApiManagedUser>(`/api/accounts/admin/users/${id}/deactivate/`, {
    method: "POST",
  });
}

export async function reactivateManagedUser(id: number) {
  return apiRequest<ApiManagedUser>(`/api/accounts/admin/users/${id}/reactivate/`, {
    method: "POST",
  });
}
