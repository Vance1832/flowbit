import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TableColumn } from "@/lib/types";

type ReceiptRow = {
  receiptNo: string;
  period: string;
  totalAmount: string;
  status: string;
  createdAt: string;
};

type TransactionRow = {
  type: string;
  amount: string;
  balanceAfter: string;
  description: string;
  date: string;
};

type NotificationItem = {
  id: string;
  type: "Deposit" | "Result" | "Receipt";
  title: string;
  time: string;
};

const recentReceipts: ReceiptRow[] = [
  {
    receiptNo: "FB-TEST02-000001",
    period: "TEST02",
    totalAmount: "MMK 6,000",
    status: "Paid",
    createdAt: "2026-06-30 10:45",
  },
];

const recentTransactions: TransactionRow[] = [
  {
    type: "Deposit Approved",
    amount: "+MMK 50,000",
    balanceAfter: "MMK 50,000",
    description: "Deposit DEP-FLOW-001",
    date: "2026-06-30 10:40",
  },
  {
    type: "Receipt Payment",
    amount: "-MMK 6,000",
    balanceAfter: "MMK 44,000",
    description: "Receipt FB-TEST02-000001",
    date: "2026-06-30 10:45",
  },
];

const notifications: NotificationItem[] = [
  {
    id: "notif-1",
    type: "Deposit",
    title: "Deposit approved",
    time: "2026-06-30 10:40",
  },
  {
    id: "notif-2",
    type: "Result",
    title: "Result period TEST02 is open",
    time: "2026-06-30 10:15",
  },
  {
    id: "notif-3",
    type: "Receipt",
    title: "Receipt submitted successfully",
    time: "2026-06-30 10:45",
  },
];

const receiptColumns: TableColumn<ReceiptRow>[] = [
  {
    key: "receiptNo",
    header: "Receipt No",
    className: "whitespace-nowrap",
    render: (row) => <span className="font-medium">{row.receiptNo}</span>,
  },
  {
    key: "period",
    header: "Period",
    className: "whitespace-nowrap",
    render: (row) => row.period,
  },
  {
    key: "totalAmount",
    header: "Total Amount",
    className: "whitespace-nowrap",
    render: (row) => row.totalAmount,
  },
  {
    key: "status",
    header: "Status",
    className: "whitespace-nowrap",
    render: (row) => <StatusBadge status="success">{row.status}</StatusBadge>,
  },
  {
    key: "createdAt",
    header: "Created At",
    className: "whitespace-nowrap",
    render: (row) => row.createdAt,
  },
  {
    key: "action",
    header: "Action",
    className: "whitespace-nowrap",
    render: () => (
      <button
        type="button"
        className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
      >
        View
      </button>
    ),
  },
];

const transactionColumns: TableColumn<TransactionRow>[] = [
  {
    key: "type",
    header: "Type",
    className: "whitespace-nowrap",
    render: (row) => <span className="font-medium">{row.type}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    className: "whitespace-nowrap",
    render: (row) => row.amount,
  },
  {
    key: "balanceAfter",
    header: "Balance After",
    className: "whitespace-nowrap",
    render: (row) => row.balanceAfter,
  },
  {
    key: "description",
    header: "Description",
    render: (row) => row.description,
  },
  {
    key: "date",
    header: "Date",
    className: "whitespace-nowrap",
    render: (row) => row.date,
  },
];

function SummaryCard({
  title,
  value,
  detail,
  badge,
  tone = "neutral",
}: {
  title: string;
  value: string;
  detail: string;
  badge?: string;
  tone?: "neutral" | "success";
}) {
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{title}</p>
        {badge ? (
          <StatusBadge status={tone === "success" ? "success" : "neutral"}>
            {badge}
          </StatusBadge>
        ) : null}
      </div>
      <p className="mt-3 text-[22px] font-semibold tracking-tight text-[var(--color-foreground)]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{detail}</p>
    </article>
  );
}

function ActionCard({
  title,
  detail,
  actionLabel,
  primary = false,
}: {
  title: string;
  detail: string;
  actionLabel: string;
  primary?: boolean;
}) {
  return (
    <article
      className={
        primary
          ? "rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          : "rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
      }
    >
      <p className="text-sm font-semibold text-[var(--color-foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{detail}</p>
      <ActionButton
        variant={primary ? "primary" : "secondary"}
        className="mt-4 h-10 rounded-xl px-4"
      >
        {actionLabel}
      </ActionButton>
    </article>
  );
}

function notificationTone(type: NotificationItem["type"]) {
  switch (type) {
    case "Deposit":
      return "success" as const;
    case "Result":
      return "info" as const;
    case "Receipt":
      return "neutral" as const;
  }
}

export function UserDashboardScreen() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--color-foreground)]">
          Wallet Dashboard
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          Manage your wallet, submit numbers, and review receipts.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Available Balance"
          value="MMK 50,000"
          detail="Ready for new receipt payments."
        />
        <SummaryCard
          title="Locked Balance"
          value="MMK 0"
          detail="No pending wallet holds."
        />
        <SummaryCard
          title="Current Period"
          value="TEST02"
          detail="Open / closes 15:00"
          badge="Open"
          tone="success"
        />
        <SummaryCard
          title="Latest Receipt"
          value="FB-TEST02-000001"
          detail="Paid"
          badge="Paid"
          tone="success"
        />
      </section>

      <section id="submit-numbers" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          title="Deposit"
          detail="Submit a wallet funding request for review."
          actionLabel="Deposit"
        />
        <ActionCard
          title="Withdraw"
          detail="Request payout from your available wallet balance."
          actionLabel="Withdraw"
        />
        <ActionCard
          title="Submit Numbers"
          detail="Create a receipt for the current open result period."
          actionLabel="Submit Numbers"
          primary
        />
        <ActionCard
          title="View Receipts"
          detail="Review submitted receipts and payment status."
          actionLabel="View Receipts"
        />
      </section>

      <div id="receipts">
        <DataTable
          title="Recent Receipts"
          description="Latest submitted receipts from your wallet activity."
          columns={receiptColumns}
          rows={recentReceipts}
        />
      </div>

      <div id="wallet">
        <DataTable
          title="Recent Wallet Transactions"
          description="Latest approved wallet movements and receipt payments."
          columns={transactionColumns}
          rows={recentTransactions}
        />
      </div>

      <section
        id="notifications"
        className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
      >
        <div className="border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Notifications Preview
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Recent updates related to your wallet and receipts.
          </p>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-[var(--color-surface-subtle)]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={notificationTone(item.type)}>{item.type}</StatusBadge>
                  <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                    {item.title}
                  </p>
                </div>
              </div>
              <p className="shrink-0 whitespace-nowrap text-xs font-medium text-[var(--color-muted-foreground)]">
                {item.time}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
