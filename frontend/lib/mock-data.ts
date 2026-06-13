import type {
  AuditEntry,
  ReserveEntry,
  ResultPeriod,
  SettlementItem,
  SidebarItem,
  StatMetric,
} from "@/lib/types";

export const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "User Management", href: "/user-management" },
  { label: "Result Periods", href: "/result-periods" },
  { label: "Ledgers", href: "/ledgers" },
  { label: "Result Entry", href: "/result-entry" },
  { label: "Settlement Preview", href: "/settlement-preview" },
  { label: "Company Reserve", href: "/company-reserve" },
  { label: "Deposit Requests", href: "/deposit-requests" },
  { label: "Withdrawal Requests", href: "/withdrawal-requests" },
  { label: "Audit Logs", href: "/audit-logs" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/settings" },
];

export const statMetrics: StatMetric[] = [
  {
    title: "Current Period",
    value: "TEST02",
    delta: "Open",
    tone: "positive",
    detail: "Closes 2026-06-30 15:00",
  },
  {
    title: "Active Ledgers",
    value: "1 open ledger",
    delta: "Active",
    tone: "positive",
    detail: "1000 numbers available",
  },
  {
    title: "Pending Deposits",
    value: "12 requests",
    delta: "MMK 450,000",
    tone: "neutral",
    detail: "Waiting for review and approval.",
  },
  {
    title: "Pending Withdrawals",
    value: "5 requests",
    delta: "MMK 180,000",
    tone: "warning",
    detail: "3 are approved and waiting to be marked as paid.",
  },
  {
    title: "Total Collected",
    value: "MMK 1,280,000",
    delta: "Today",
    tone: "positive",
    detail: "Collected across the current result period.",
  },
  {
    title: "Settlement Status",
    value: "Waiting",
    delta: "TEST02",
    tone: "warning",
    detail: "Waiting for TEST02 result entry.",
  },
  {
    title: "Company Reserve",
    value: "MMK 3,000,000",
    delta: "Available",
    tone: "positive",
    detail: "Main reserve available for settlement use.",
  },
  {
    title: "Last Settlement",
    value: "MMK 2,100,000",
    delta: "Paid",
    tone: "neutral",
    detail: "SET-TEST02-001",
  },
];

export const resultPeriods: ResultPeriod[] = [
  {
    id: "rp-test02",
    drawCode: "TEST02",
    name: "Test Period 02",
    resultDate: "2026-06-30",
    closeAt: "2026-06-30 15:00",
    entries: 128,
    totalCollected: "MMK 1,280,000",
    status: "success",
  },
];

export const settlementQueue: SettlementItem[] = [
  {
    id: "stl-test02-001",
    batch: "SET-TEST02-001",
    ledger: "Test Ledger 02",
    resultPeriod: "TEST02",
    resultNumber: "124",
    totalCollected: "MMK 1,280,000",
    totalSettlement: "MMK 2,100,000",
    status: "info",
  },
];

export const reserveBreakdown: ReserveEntry[] = [
  {
    label: "Main Company Reserve",
    amount: "MMK 3,000,000",
    detail: "Available for approved settlement use.",
    tone: "success",
  },
  {
    label: "Reserve Used In Last Settlement",
    amount: "MMK 2,094,000",
    detail: "Latest settlement preview generated after result entry.",
    tone: "warning",
  },
  {
    label: "Reserve Remaining After Last Settlement",
    amount: "MMK 906,000",
    detail: "Reserve remaining after the latest settlement payout.",
    tone: "info",
  },
];

export const recentAudits: AuditEntry[] = [
  {
    id: "aud-9001",
    actor: "admin01",
    action: "Approved Withdrawal Request",
    target: "WD-0005",
    reason: "Account details verified.",
    at: "09:44 AM",
  },
  {
    id: "aud-9002",
    actor: "owner01",
    action: "Created Result Period",
    target: "TEST02",
    reason: "Prepared next open period.",
    at: "09:21 AM",
  },
  {
    id: "aud-9003",
    actor: "admin02",
    action: "Created Ledger",
    target: "Test Ledger 02",
    reason: "Added ledger for TEST02 entries.",
    at: "08:58 AM",
  },
];
