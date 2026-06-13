import type { ReactNode } from "react";

export type StatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type SidebarItem = {
  label: string;
  href: string;
  badge?: string;
};

export type StatMetric = {
  title: string;
  value: string;
  delta: string;
  tone: "positive" | "negative" | "neutral" | "warning";
  detail: string;
};

export type ResultPeriod = {
  id: string;
  drawCode: string;
  name: string;
  resultDate: string;
  closeAt: string;
  entries: number;
  totalCollected: string;
  status: StatusTone;
};

export type SettlementItem = {
  id: string;
  batch: string;
  ledger: string;
  resultPeriod: string;
  resultNumber: string;
  totalCollected: string;
  totalSettlement: string;
  status: StatusTone;
};

export type ReserveEntry = {
  label: string;
  amount: string;
  detail: string;
  tone: StatusTone;
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  reason: string;
  at: string;
};

export type TableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};
