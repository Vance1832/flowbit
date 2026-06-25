import type { SidebarItem } from "@/lib/types";

// Owner / admin console navigation. The dashboard lives at /console so the
// public landing page can own the / route.
export const ownerNavItems: SidebarItem[] = [
  { label: "Dashboard", href: "/console" },
  { label: "User Management", href: "/user-management" },
  { label: "Result Periods", href: "/result-periods" },
  { label: "Ledgers", href: "/ledgers" },
  { label: "Ledger Templates", href: "/ledger-templates" },
  { label: "Result Entry", href: "/result-entry" },
  { label: "Settlement Preview", href: "/settlement-preview" },
  { label: "Company Reserve", href: "/company-reserve" },
  { label: "Deposit Requests", href: "/deposit-requests" },
  { label: "Withdrawal Requests", href: "/withdrawal-requests" },
  { label: "KYC Review", href: "/kyc" },
  { label: "Audit Logs", href: "/audit-logs" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/settings" },
];

// Maps a sidebar item's English label (used as icon/badge logic key) to its
// i18n message key, so the shells can render localized nav labels.
export const NAV_LABEL_KEY: Record<string, string> = {
  Dashboard: "consoleNav.dashboard",
  "User Management": "consoleNav.userManagement",
  "Result Periods": "consoleNav.resultPeriods",
  Ledgers: "consoleNav.ledgers",
  "Ledger Templates": "consoleNav.ledgerTemplates",
  "Result Entry": "consoleNav.resultEntry",
  "Settlement Preview": "consoleNav.settlementPreview",
  "Company Reserve": "consoleNav.companyReserve",
  "Deposit Requests": "consoleNav.depositRequests",
  "Withdrawal Requests": "consoleNav.withdrawalRequests",
  "KYC Review": "consoleNav.kycReview",
  "Audit Logs": "consoleNav.auditLogs",
  Notifications: "consoleNav.notifications",
  Settings: "consoleNav.settings",
  Profile: "consoleNav.profile",
};
