import type { SidebarItem } from "@/lib/types";

// Owner / admin console navigation. The dashboard lives at /console so the
// public landing page can own the / route.
export const ownerNavItems: SidebarItem[] = [
  { label: "Dashboard", href: "/console" },
  { label: "User Management", href: "/user-management" },
  { label: "Result Periods", href: "/result-periods" },
  { label: "Ledgers", href: "/ledgers" },
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
