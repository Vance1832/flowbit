import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";

export type ApiResultPeriod = {
  id: number;
  code: string;
  name: string;
  result_date: string;
  default_close_time: string;
  result_number: string | null;
  result_source: string;
  is_visible_to_users: boolean;
  status: string;
  result_entered_by: number | null;
  result_entered_at: string | null;
  result_voided_by: number | null;
  result_voided_at: string | null;
  result_void_reason: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
};

export type ApiLedger = {
  id: number;
  result_period: number;
  result_period_code?: string;
  name: string;
  capacity_per_number: string;
  settlement_rate: string;
  priority_order: number;
  open_at: string;
  close_at: string;
  status: string;
  manually_closed_by: number | null;
  manually_closed_at: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
};

export type ApiLedgerNumber = {
  id: number;
  ledger: number;
  number_code: string;
  max_capacity: string;
  used_amount: string;
  remaining_amount: string;
  updated_at: string;
};

export type ApiUserVisibleResult = {
  period_code?: string;
  result_date: string;
  result_number: string;
  status?: string;
  my_receipt_status?: string;
  matched_receipt_no?: string | null;
  matched_number?: string | null;
  matched_amount?: string | null;
  settlement_amount?: string | null;
  wallet_credit_status?: string | null;
};

export type ApiUserCurrentResultPeriod = {
  code: string;
  name: string;
  result_date: string;
  default_close_time: string;
  status: string;
  betting_open: boolean;
  betting_closes_at: string | null;
};

export type ApiUserLatestVisibleResult = {
  code: string;
  name: string;
  result_date: string;
  result_number: string;
  settled_at: string;
  visible_until: string;
};

export type ApiUserResultOverview = {
  current_open_period: ApiUserCurrentResultPeriod | null;
  latest_visible_result: ApiUserLatestVisibleResult | null;
  recent_results: ApiUserVisibleResult[];
};

export type ApiEnterResultResponse = {
  detail: string;
  settlement_batch_id: number;
  result_period: string;
  result_number: string;
  status: string;
  total_collected: string;
  total_settlement: string;
  reserve_required: string;
  profit_loss: string;
};

export async function getAdminResultPeriods() {
  return apiRequest<PaginatedResponse<ApiResultPeriod> | ApiResultPeriod[]>(
    "/api/ledgers/admin/result-periods/",
  );
}

export async function createResultPeriod(input: {
  code: string;
  name: string;
  result_date: string;
  default_close_time: string;
  is_visible_to_users: boolean;
  status: string;
}) {
  return apiRequest<ApiResultPeriod>("/api/ledgers/admin/result-periods/", {
    method: "POST",
    body: input,
  });
}

export async function updateResultPeriod(id: number, input: Partial<ApiResultPeriod>) {
  return apiRequest<ApiResultPeriod>(`/api/ledgers/admin/result-periods/${id}/`, {
    method: "PATCH",
    body: input,
  });
}

export async function closeResultPeriod(id: number) {
  return apiRequest<ApiResultPeriod>(`/api/ledgers/admin/result-periods/${id}/close/`, {
    method: "POST",
  });
}

export type ApiOfficialResult =
  | { available: false }
  | {
      available: true;
      three_up: string;
      two_down: string | null;
      draw_date: string;
      source: string;
      cross_check_ok: boolean | null;
    };

export async function getOfficialResult(periodId: number) {
  return apiRequest<ApiOfficialResult>(
    `/api/ledgers/admin/result-periods/${periodId}/official-result/`,
  );
}

export type ResultSource = "manual" | "api_checked_manual_confirmed";

export async function enterResult(
  id: number,
  result_number: string,
  result_source: ResultSource = "manual",
) {
  return apiRequest<ApiEnterResultResponse>(
    `/api/ledgers/admin/result-periods/${id}/enter-result/`,
    {
      method: "POST",
      body: { result_number, result_source },
    },
  );
}

export async function getAdminLedgers() {
  return apiRequest<PaginatedResponse<ApiLedger> | ApiLedger[]>(
    "/api/ledgers/admin/ledgers/",
  );
}

export async function createLedger(input: {
  result_period: number;
  name: string;
  capacity_per_number: number;
  settlement_rate: number;
  priority_order: number;
  open_at: string;
  close_at: string;
  status: string;
}) {
  return apiRequest<ApiLedger>("/api/ledgers/admin/ledgers/", {
    method: "POST",
    body: input,
  });
}

export async function updateLedger(
  id: number,
  input: Partial<
    Omit<
      ApiLedger,
      "capacity_per_number" | "settlement_rate" | "priority_order" | "open_at" | "close_at" | "result_period"
    >
  > & {
    capacity_per_number?: number;
    settlement_rate?: number;
    priority_order?: number;
    open_at?: string;
    close_at?: string;
    result_period?: number;
  },
) {
  return apiRequest<ApiLedger>(`/api/ledgers/admin/ledgers/${id}/`, {
    method: "PATCH",
    body: input,
  });
}

export async function getLedgerNumbers(id: number) {
  return apiRequest<PaginatedResponse<ApiLedgerNumber> | ApiLedgerNumber[]>(
    `/api/ledgers/admin/ledgers/${id}/numbers/?page_size=1000`,
  );
}

export async function getUserVisibleResults() {
  return apiRequest<ApiUserVisibleResult[]>("/api/ledgers/results/");
}

export async function getUserCurrentResultPeriod() {
  return apiRequest<ApiUserCurrentResultPeriod>("/api/ledgers/current-period/");
}

export async function getUserResultOverview() {
  return apiRequest<ApiUserResultOverview>("/api/ledgers/results-overview/");
}

export type ApiLedgerTemplateTier = {
  id?: number;
  name: string;
  capacity_per_number: string;
  settlement_rate: string;
  priority_order: number;
};

export type ApiLedgerTemplate = {
  id: number;
  name: string;
  tiers: ApiLedgerTemplateTier[];
  created_by_name?: string;
  created_at: string;
  updated_at: string;
};

export async function getLedgerTemplates() {
  return apiRequest<PaginatedResponse<ApiLedgerTemplate> | ApiLedgerTemplate[]>(
    "/api/ledgers/admin/ledger-templates/",
  );
}

export async function createLedgerTemplate(input: {
  name: string;
  tiers: Array<Omit<ApiLedgerTemplateTier, "id">>;
}) {
  return apiRequest<ApiLedgerTemplate>("/api/ledgers/admin/ledger-templates/", {
    method: "POST",
    body: input,
  });
}

export async function deleteLedgerTemplate(id: number) {
  return apiRequest<unknown>(`/api/ledgers/admin/ledger-templates/${id}/`, {
    method: "DELETE",
  });
}

export async function buildLedgersFromTemplate(periodId: number, templateId: number) {
  return apiRequest<{ detail: string; ledgers: ApiLedger[] }>(
    `/api/ledgers/admin/result-periods/${periodId}/build-ledgers/`,
    { method: "POST", body: { template_id: templateId } },
  );
}
