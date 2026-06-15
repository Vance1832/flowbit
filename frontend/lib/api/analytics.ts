import { apiRequest } from "@/lib/api/client";

export type AnalyticsSummary = {
  total_collected: string;
  total_settlement: string;
  net_profit_loss: string;
  reserve_balance: string;
};

export type PeriodPerformance = {
  code: string;
  collected: string;
  settlement: string;
  profit_loss: string;
};

export type CashflowPoint = {
  date: string;
  deposits: string;
  withdrawals: string;
};

export type Analytics = {
  summary: AnalyticsSummary;
  period_performance: PeriodPerformance[];
  cashflow: CashflowPoint[];
};

export async function getAnalytics() {
  return apiRequest<Analytics>("/api/company/admin/analytics/");
}
