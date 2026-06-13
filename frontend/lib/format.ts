export function formatMmkAmount(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "MMK 0";
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  const sign = numericValue < 0 ? "-" : "";

  return `${sign}MMK ${Math.abs(numericValue).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Local date as `YYYY-MM-DD` (e.g. for "Today" filters). */
export function todayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Local date 6 days ago as `YYYY-MM-DD` (inclusive start of "This Week"). */
export function weekStartDateString() {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}

/** Local month as `YYYY-MM` (e.g. for "This Month" filters). */
export function currentMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTimeOnly(value: string | null | undefined) {
  if (!value) return "—";

  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value.slice(0, 5);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
