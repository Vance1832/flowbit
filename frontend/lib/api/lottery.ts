import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";

export type ApiLotteryDraw = {
  draw_date: string;
  three_up: string;
  two_down: string | null;
  source: string;
};

export async function getLotteryDraws(page = 1, pageSize = 30) {
  return apiRequest<PaginatedResponse<ApiLotteryDraw>>(
    `/api/lottery/draws/?page=${page}&page_size=${pageSize}`,
  );
}
