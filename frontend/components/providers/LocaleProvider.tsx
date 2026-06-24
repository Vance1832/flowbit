"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { messagesByLocale, type Messages } from "@/messages";

export type TranslateVars = Record<string, string | number>;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  // Dot-path lookup, e.g. t("login.title"); supports {var} interpolation.
  t: (key: string, vars?: TranslateVars) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  try {
    // Cookie is the source of truth so the server can render the right `lang`
    // (mirrors the theme cookie — no flash, no hydration mismatch).
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // ignore (e.g. cookies disabled)
  }
}

function lookup(messages: Messages, key: string): string | undefined {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function LocaleProvider({
  initialLocale = "en",
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  // Seeded from the server-read cookie, so the first client render matches SSR.
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useMemo(
    () => (next: Locale) => {
      setLocaleState(next);
      applyLocale(next);
    },
    [],
  );

  const value = useMemo<LocaleContextValue>(() => {
    const messages = messagesByLocale[locale];
    return {
      locale,
      setLocale,
      toggleLocale: () => setLocale(locale === "my" ? "en" : "my"),
      t: (key, vars) => {
        const template = lookup(messages, key);
        if (template === undefined) {
          if (process.env.NODE_ENV !== "production") {
            // Surface missing keys in dev without crashing the UI.
            console.warn(`[i18n] missing message for key "${key}" (${locale})`);
          }
          return key;
        }
        return interpolate(template, vars);
      },
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

/** Convenience hook for components that only need the translate function. */
export function useTranslations() {
  return useLocale().t;
}
