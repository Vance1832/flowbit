"use client";

import { useEffect, useState } from "react";

import { GroupedBarChart } from "@/components/ui/GroupedBarChart";
import { StatCard } from "@/components/ui/StatCard";
import { getAnalytics, type Analytics } from "@/lib/api/analytics";
import { formatMmkAmount } from "@/lib/format";

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <span key={item.name} className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  legend,
  children,
}: {
  title: string;
  legend: { name: string; color: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
        <Legend items={legend} />
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function AnalyticsSection() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await getAnalytics();
        if (active) setData(result);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load analytics.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return error ? (
      <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
        {error}
      </div>
    ) : null;
  }

  const netPL = Number(data.summary.net_profit_loss);
  const kpis = [
    {
      title: "Total Collected",
      value: formatMmkAmount(data.summary.total_collected),
      delta: "All periods",
      tone: "neutral" as const,
      detail: "Paid records across settled periods",
    },
    {
      title: "Total Settlement",
      value: formatMmkAmount(data.summary.total_settlement),
      delta: "All periods",
      tone: "warning" as const,
      detail: "Credited to matched participants",
    },
    {
      title: "Net Profit / Loss",
      value: formatMmkAmount(data.summary.net_profit_loss),
      delta: netPL >= 0 ? "Profit" : "Loss",
      tone: netPL >= 0 ? ("positive" as const) : ("negative" as const),
      detail: "Collected minus settlement",
    },
    {
      title: "Company Reserve",
      value: formatMmkAmount(data.summary.reserve_balance),
      delta: "Available",
      tone: "neutral" as const,
      detail: "Funds available to cover shortfalls",
    },
  ];

  const periodLegend = [
    { name: "Collected", color: "var(--color-primary)" },
    { name: "Settlement", color: "var(--color-accent)" },
  ];
  const cashflowLegend = [
    { name: "Deposits", color: "var(--color-success)" },
    { name: "Withdrawals", color: "var(--color-danger)" },
  ];

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Collected vs Settlement" legend={periodLegend}>
          {data.period_performance.length > 0 ? (
            <GroupedBarChart
              ariaLabel="Collected versus settlement by result period"
              categories={data.period_performance.map((p) => p.code)}
              formatValue={(value) => formatMmkAmount(value)}
              series={[
                {
                  name: "Collected",
                  color: "var(--color-primary)",
                  values: data.period_performance.map((p) => Number(p.collected)),
                },
                {
                  name: "Settlement",
                  color: "var(--color-accent)",
                  values: data.period_performance.map((p) => Number(p.settlement)),
                },
              ]}
            />
          ) : (
            <p className="py-10 text-center text-sm text-[var(--color-muted-foreground)]">
              No settled periods yet.
            </p>
          )}
        </ChartCard>

        <ChartCard title="Cashflow · last 14 days" legend={cashflowLegend}>
          <GroupedBarChart
            ariaLabel="Deposits versus withdrawals over the last 14 days"
            categories={data.cashflow.map((c) => c.date.slice(5))}
            formatValue={(value) => formatMmkAmount(value)}
            series={[
              {
                name: "Deposits",
                color: "var(--color-success)",
                values: data.cashflow.map((c) => Number(c.deposits)),
              },
              {
                name: "Withdrawals",
                color: "var(--color-danger)",
                values: data.cashflow.map((c) => Number(c.withdrawals)),
              },
            ]}
          />
        </ChartCard>
      </div>
    </section>
  );
}
