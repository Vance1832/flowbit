import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";

export type ApiRgControl = {
  daily_deposit_limit: string | null;
  daily_stake_limit: string | null;
  self_excluded_until: string | null;
  updated_at: string;
};

export async function getResponsibleGambling() {
  return apiRequest<ApiRgControl>("/api/compliance/responsible-gambling/");
}

export async function updateResponsibleGambling(
  input: Partial<Pick<ApiRgControl, "daily_deposit_limit" | "daily_stake_limit" | "self_excluded_until">>,
) {
  return apiRequest<ApiRgControl>("/api/compliance/responsible-gambling/", {
    method: "PUT",
    body: input,
  });
}

export type ApiKycSubmission = {
  id: number;
  user_name?: string;
  user_phone?: string;
  document_type: "nrc" | "passport" | "driver_license";
  document_number: string;
  document_image: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export async function getMyKyc() {
  return apiRequest<PaginatedResponse<ApiKycSubmission> | ApiKycSubmission[]>(
    "/api/compliance/kyc/",
  );
}

export async function submitKyc(input: {
  document_type: string;
  document_number: string;
  document_image: File;
}) {
  const form = new FormData();
  form.append("document_type", input.document_type);
  form.append("document_number", input.document_number);
  form.append("document_image", input.document_image);
  return apiRequest<ApiKycSubmission>("/api/compliance/kyc/", {
    method: "POST",
    body: form,
  });
}

export async function getAdminKyc(status?: string) {
  const query = status ? `?status=${status}` : "";
  return apiRequest<PaginatedResponse<ApiKycSubmission> | ApiKycSubmission[]>(
    `/api/compliance/admin/kyc/${query}`,
  );
}

export async function reviewKyc(
  id: number,
  status: "approved" | "rejected",
  review_note?: string,
) {
  return apiRequest<ApiKycSubmission>(`/api/compliance/admin/kyc/${id}/review/`, {
    method: "POST",
    body: { status, review_note },
  });
}
