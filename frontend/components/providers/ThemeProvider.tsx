"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { THEME_COOKIE, type Theme } from "@/lib/theme";

export { THEME_COOKIE, type Theme };

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    // Cookie is the source of truth so the server can render the right class
    // (no flash, no hydration mismatch, no inline script needed).
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // ignore (e.g. cookies disabled)
  }
}

export function ThemeProvider({
  initialTheme = "light",
  children,
}: {
  initialTheme?: Theme;
  children: ReactNode;
}) {
  // Seeded from the server-read cookie, so the first client render matches SSR.
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useMemo(
    () => (next: Theme) => {
      setThemeState(next);
      applyTheme(next);
    },
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
