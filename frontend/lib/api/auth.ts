import { apiRequest } from "@/lib/api/client";

export type BackendUserRole = "owner" | "admin" | "staff" | "user" | "vip_user";
export type BackendUserStatus = "active" | "deactivated" | "suspended";

export type AuthLoginUser = {
  id: number;
  name: string;
  phone: string;
  role: BackendUserRole;
  status: BackendUserStatus;
};

export type CurrentUser = AuthLoginUser & {
  phone_country_code: string;
  phone_number: string;
  email: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  avatar_url?: string | null;
};

export type LoginResponse = {
  refresh: string;
  access: string;
  user: AuthLoginUser;
};

export type RefreshResponse = {
  access: string;
};

export async function loginRequest(phone: string, password: string) {
  return apiRequest<LoginResponse>("/api/auth/login/", {
    method: "POST",
    body: { phone, password },
  });
}

export async function refreshRequest(refresh: string) {
  return apiRequest<RefreshResponse>("/api/auth/refresh/", {
    method: "POST",
    body: { refresh },
  });
}

export async function getCurrentUserRequest(token?: string | null) {
  return apiRequest<CurrentUser>("/api/accounts/me/", {
    method: "GET",
    token,
  });
}
