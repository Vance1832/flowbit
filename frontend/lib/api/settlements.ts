import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";

export type ApiSettlementItemSource = {
  id: number;
  settlement_item: number;
  receipt_item: number;
  matched_amount: string;
};

export type ApiSettlementItem = {
  id: number;
  settlement_batch: number;
  user: number;
  user_name?: string;
  user_phone?: string;
  number_code: string;
  total_matched_amount: string;
  settlement_rate: string;
  settlement_amount: string;
  wallet_transaction: number | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  sources: ApiSettlementItemSource[];
};

export type ApiSettlementBatch = {
  id: number;
  result_period: number;
  result_period_code?: string;
  result_number: string;
  total_collected: string;
  total_settlement: string;
  company_reserve_required: string;
  company_reserve_used: string;
  final_profit_loss: string;
  status: string;
  previewed_by: number;
  previewed_at: string;
  approved_by: number | null;
  approved_at: string | null;
  paid_at: string | null;
  voided_by: number | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  items: ApiSettlementItem[];
};

export async function getSettlementBatches() {
  return apiRequest<PaginatedResponse<ApiSettlementBatch> | ApiSettlementBatch[]>(
    "/api/settlements/admin/batches/",
  );
}

export async function getSettlementBatch(id: number) {
  return apiRequest<ApiSettlementBatch>(`/api/settlements/admin/batches/${id}/`);
}

export async function approveSettlement(id: number) {
  return apiRequest<ApiSettlementBatch>(
    `/api/settlements/admin/batches/${id}/approve/`,
    { method: "POST" },
  );
}

export async function voidSettlement(id: number, reason: string) {
  return apiRequest<ApiSettlementBatch>(
    `/api/settlements/admin/batches/${id}/void/`,
    { method: "POST", body: { reason } },
  );
}
