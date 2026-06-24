// Plain (non-"use client") module so the value can be imported by both the
// server layout and the client LocaleProvider — mirroring lib/theme.ts.
export type Locale = "en" | "my";

export const LOCALE_COOKIE = "flowbit_locale";
export const LOCALES: Locale[] = ["en", "my"];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  my: "မြန်မာ",
};

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "my" ? "my" : "en";
}
