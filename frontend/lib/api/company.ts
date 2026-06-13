import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";

export type ApiCompanyWallet = {
  id: number;
  name: string;
  balance: string;
  created_at: string;
  updated_at: string;
};

export type ApiCompanyWalletTransaction = {
  id: number;
  company_wallet: number;
  transaction_type: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  reference_table: string | null;
  reference_id: number | null;
  description: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
};

export type ApiCompanyCashoutRequest = {
  id: number;
  company_wallet: number;
  requested_by: number;
  requested_by_name?: string;
  approved_by: number | null;
  approved_by_name?: string;
  amount: string;
  status: string;
  reason: string | null;
  admin_note: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getCompanyWallets() {
  return apiRequest<PaginatedResponse<ApiCompanyWallet> | ApiCompanyWallet[]>(
    "/api/company/admin/wallets/",
  );
}

export async function addCompanyReserve(
  walletId: number,
  input: { amount: number; description?: string },
) {
  return apiRequest<ApiCompanyWallet>(
    `/api/company/admin/wallets/${walletId}/add-reserve/`,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function getCompanyTransactions() {
  return apiRequest<
    PaginatedResponse<ApiCompanyWalletTransaction> | ApiCompanyWalletTransaction[]
  >("/api/company/admin/transactions/");
}

export async function getCompanyCashouts() {
  return apiRequest<PaginatedResponse<ApiCompanyCashoutRequest> | ApiCompanyCashoutRequest[]>(
    "/api/company/admin/cashouts/",
  );
}

export async function createCompanyCashout(input: {
  amount: number;
  reason?: string;
  admin_note?: string;
}) {
  return apiRequest<ApiCompanyCashoutRequest>("/api/company/admin/cashouts/", {
    method: "POST",
    body: input,
  });
}

export async function approveCompanyCashout(id: number, admin_note?: string) {
  return apiRequest<ApiCompanyCashoutRequest>(
    `/api/company/admin/cashouts/${id}/approve/`,
    {
      method: "POST",
      body: { admin_note },
    },
  );
}

export async function markCompanyCashoutPaid(id: number, admin_note?: string) {
  return apiRequest<ApiCompanyCashoutRequest>(
    `/api/company/admin/cashouts/${id}/mark-paid/`,
    {
      method: "POST",
      body: { admin_note },
    },
  );
}
