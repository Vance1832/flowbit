import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flowbit Owner Console",
  description:
    "Flowbit operational dashboard for result periods, ledgers, settlements, and reserve management.",
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
