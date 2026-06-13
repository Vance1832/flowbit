export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export function ensureResults<T>(payload: PaginatedResponse<T> | T[]) {
  return Array.isArray(payload) ? payload : payload.results;
}
