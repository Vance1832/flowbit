import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Flowbit — Wallet & Ledger System",
    template: "%s · Flowbit",
  },
  description:
    "Flowbit is a wallet and results platform with instant payouts for players and reserve-backed ledgers, settlements, and approvals for operators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-app-bg)] text-[var(--color-foreground)] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
