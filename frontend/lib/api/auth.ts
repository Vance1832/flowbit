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

export type PasswordResetRequestResponse = {
  detail: string;
  debug_code?: string; // present only in dev (DEBUG) so the flow is testable
};

export async function requestPasswordReset(phone: string) {
  return apiRequest<PasswordResetRequestResponse>(
    "/api/accounts/password-reset/request/",
    { method: "POST", body: { phone } },
  );
}

export async function confirmPasswordReset(input: {
  phone: string;
  code: string;
  new_password: string;
  confirm_password: string;
}) {
  return apiRequest<{ detail: string }>(
    "/api/accounts/password-reset/confirm/",
    { method: "POST", body: input },
  );
}

export async function requestPhoneVerification() {
  return apiRequest<{ detail: string; debug_code?: string }>(
    "/api/accounts/phone-verification/request/",
    { method: "POST", body: {} },
  );
}

export async function confirmPhoneVerification(code: string) {
  return apiRequest<{ detail: string }>(
    "/api/accounts/phone-verification/confirm/",
    { method: "POST", body: { code } },
  );
}

export async function requestEmailVerification() {
  return apiRequest<{ detail: string; debug_code?: string }>(
    "/api/accounts/email-verification/request/",
    { method: "POST", body: {} },
  );
}

export async function confirmEmailVerification(code: string) {
  return apiRequest<{ detail: string }>(
    "/api/accounts/email-verification/confirm/",
    { method: "POST", body: { code } },
  );
}
