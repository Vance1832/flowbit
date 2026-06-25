"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { isOwnerOrAdmin, useAuth } from "@/components/providers/AuthProvider";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { NotificationsProvider } from "@/components/providers/NotificationsProvider";
import { ownerNavItems } from "@/lib/nav";

export function OwnerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const t = useTranslations();
  const { authLoading, getDefaultRoute, isAuthenticated, user } = useAuth();
  const canAccess = isOwnerOrAdmin(user?.role);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!canAccess) {
      router.replace(getDefaultRoute(user?.role));
    }
  }, [authLoading, canAccess, getDefaultRoute, isAuthenticated, router, user?.role]);

  if (authLoading || !isAuthenticated || !canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-app-bg)]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-6 py-5 text-sm text-[var(--color-muted-foreground)] shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
          {t("userShell.checkingSession")}
        </div>
      </div>
    );
  }

  return (
    <NotificationsProvider>
      <div className="flex min-h-screen bg-[var(--color-app-bg)] text-[var(--color-foreground)]">
        {sidebarOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <Sidebar
          items={ownerNavItems}
          open={sidebarOpen}
          onNavigate={() => setSidebarOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto px-6 py-5 xl:px-8">
            <div className="mx-auto w-full max-w-[1480px]">{children}</div>
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
