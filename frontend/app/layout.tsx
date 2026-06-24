import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import "./globals.css";

// The root reads the theme cookie per request, so render dynamically.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Flowbit — Ledger & Settlement System",
    template: "%s · Flowbit",
  },
  description:
    "Flowbit is a number-based ledger and settlement management system: paid number records (000–999), priority ledger allocation, user wallets, and admin-approved, reserve-backed settlement.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme: Theme =
    cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale} className={theme === "dark" ? "dark" : undefined}>
      <body className="min-h-screen bg-[var(--color-app-bg)] text-[var(--color-foreground)] antialiased">
        <LocaleProvider initialLocale={locale}>
          <ThemeProvider initialTheme={theme}>
            <MaintenanceBanner />
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
