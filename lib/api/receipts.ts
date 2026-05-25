import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";

export type ApiReceiptItem = {
  id: number;
  number_code: string;
  amount: string;
  is_generated_by_r: boolean;
  source_input: string | null;
  created_at: string;
};

export type ApiReceipt = {
  id: number;
  receipt_no: string;
  result_period: number;
  result_period_code?: string;
  total_amount: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  items: ApiReceiptItem[];
};

export async function getMyReceipts() {
  return apiRequest<PaginatedResponse<ApiReceipt> | ApiReceipt[]>("/api/receipts/");
}

export async function getReceiptDetail(id: number) {
  return apiRequest<ApiReceipt>(`/api/receipts/${id}/`);
}

export async function submitReceipt(input: {
  result_period_code: string;
  items: Array<{
    number_code: string;
    amount: number;
    use_r?: boolean;
  }>;
}) {
  return apiRequest<ApiReceipt>("/api/receipts/submit/", {
    method: "POST",
    body: input,
  });
}
