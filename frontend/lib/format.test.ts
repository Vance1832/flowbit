import { describe, expect, it } from "vitest";

import {
  currentMonthString,
  formatDateOnly,
  formatMmkAmount,
  todayDateString,
  weekStartDateString,
} from "./format";

describe("formatMmkAmount", () => {
  it("formats numbers with thousands separators", () => {
    expect(formatMmkAmount(2144000)).toBe("MMK 2,144,000");
  });

  it("handles strings and negatives", () => {
    expect(formatMmkAmount("1500")).toBe("MMK 1,500");
    expect(formatMmkAmount(-2000)).toBe("-MMK 2,000");
  });

  it("falls back to MMK 0 for empty values", () => {
    expect(formatMmkAmount(null)).toBe("MMK 0");
    expect(formatMmkAmount(undefined)).toBe("MMK 0");
    expect(formatMmkAmount("")).toBe("MMK 0");
  });
});

describe("date helpers", () => {
  it("todayDateString matches YYYY-MM-DD", () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("currentMonthString matches YYYY-MM and prefixes today", () => {
    expect(currentMonthString()).toMatch(/^\d{4}-\d{2}$/);
    expect(todayDateString().startsWith(currentMonthString())).toBe(true);
  });

  it("weekStartDateString is on or before today", () => {
    expect(weekStartDateString() <= todayDateString()).toBe(true);
  });
});

describe("formatDateOnly", () => {
  it("keeps already-formatted dates and renders a dash for empty", () => {
    expect(formatDateOnly("2026-06-13")).toBe("2026-06-13");
    expect(formatDateOnly(null)).toBe("—");
  });
});
