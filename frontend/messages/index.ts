import type { Locale } from "@/lib/i18n";
import { en } from "./en";
import { my } from "./my";

// English defines the canonical shape; `my` must structurally match it.
export type Messages = typeof en;

export const messagesByLocale: Record<Locale, Messages> = { en, my };
