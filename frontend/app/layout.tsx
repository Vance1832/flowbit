import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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

  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined}>
      <body className="min-h-screen bg-[var(--color-app-bg)] text-[var(--color-foreground)] antialiased">
        <ThemeProvider initialTheme={theme}>
          <MaintenanceBanner />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
