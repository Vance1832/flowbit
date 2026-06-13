import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";

export type ApiWallet = {
  id: number;
  balance: string;
  locked_balance: string;
  created_at: string;
  updated_at: string;
};

export type ApiWalletTransaction = {
  id: number;
  transaction_type: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  reference_table: string | null;
  reference_id: number | null;
  description: string | null;
  created_at: string;
};

export type ApiDepositRequest = {
  id: number;
  user_name?: string;
  user_phone?: string;
  amount: string;
  payment_method: string | null;
  sender_account_name: string | null;
  transaction_reference: string | null;
  proof_image_url: string | null;
  user_note: string | null;
  staff_note: string | null;
  status: string;
  assigned_to: number | null;
  assigned_to_name?: string;
  assigned_at: string | null;
  reviewed_by: number | null;
  reviewed_by_name?: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiWithdrawalRequest = {
  id: number;
  user_name?: string;
  user_phone?: string;
  amount: string;
  payment_account_name: string | null;
  payment_account_number: string | null;
  payment_method: string | null;
  user_note: string | null;
  staff_note: string | null;
  status: string;
  reviewed_by: number | null;
  reviewed_by_name?: string;
  reviewed_at: string | null;
  paid_by: number | null;
  paid_by_name?: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMyWallet() {
  return apiRequest<ApiWallet>("/api/wallets/me/");
}

export async function getMyWalletTransactions() {
  return apiRequest<PaginatedResponse<ApiWalletTransaction>>(
    "/api/wallets/transactions/",
  );
}

export async function getMyDepositRequests() {
  return apiRequest<PaginatedResponse<ApiDepositRequest>>("/api/wallets/deposits/");
}

export async function createDepositRequest(input: {
  amount: number;
  payment_method: string;
  sender_account_name: string;
  transaction_reference: string;
  user_note?: string;
}) {
  return apiRequest<ApiDepositRequest>("/api/wallets/deposits/", {
    method: "POST",
    body: input,
  });
}

export async function getMyWithdrawalRequests() {
  return apiRequest<PaginatedResponse<ApiWithdrawalRequest>>(
    "/api/wallets/withdrawals/",
  );
}

export async function createWithdrawalRequest(input: {
  amount: number;
  payment_method: string;
  payment_account_name: string;
  payment_account_number: string;
  user_note?: string;
}) {
  return apiRequest<ApiWithdrawalRequest>("/api/wallets/withdrawals/", {
    method: "POST",
    body: input,
  });
}

export async function getAdminDepositRequests() {
  return apiRequest<PaginatedResponse<ApiDepositRequest>>(
    "/api/wallets/admin/deposits/",
  );
}

export async function assignDepositRequest(id: number) {
  return apiRequest<ApiDepositRequest>(`/api/wallets/admin/deposits/${id}/assign/`, {
    method: "POST",
  });
}

export async function approveDepositRequest(id: number, staff_note?: string) {
  return apiRequest<ApiDepositRequest>(`/api/wallets/admin/deposits/${id}/approve/`, {
    method: "POST",
    body: { staff_note },
  });
}

export async function rejectDepositRequest(id: number, staff_note?: string) {
  return apiRequest<ApiDepositRequest>(`/api/wallets/admin/deposits/${id}/reject/`, {
    method: "POST",
    body: { staff_note },
  });
}

export async function getAdminWithdrawalRequests() {
  return apiRequest<PaginatedResponse<ApiWithdrawalRequest>>(
    "/api/wallets/admin/withdrawals/",
  );
}

export async function approveWithdrawalRequest(id: number, staff_note?: string) {
  return apiRequest<ApiWithdrawalRequest>(
    `/api/wallets/admin/withdrawals/${id}/approve/`,
    {
      method: "POST",
      body: { staff_note },
    },
  );
}

export async function rejectWithdrawalRequest(id: number, staff_note?: string) {
  return apiRequest<ApiWithdrawalRequest>(
    `/api/wallets/admin/withdrawals/${id}/reject/`,
    {
      method: "POST",
      body: { staff_note },
    },
  );
}

export async function markWithdrawalPaid(id: number, staff_note?: string) {
  return apiRequest<ApiWithdrawalRequest>(
    `/api/wallets/admin/withdrawals/${id}/mark-paid/`,
    {
      method: "POST",
      body: { staff_note },
    },
  );
}
