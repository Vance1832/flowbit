"use client";

import { useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero } from "@/components/ui/PageHero";
import { StatTile } from "@/components/ui/StatTile";
import { getLotteryDraws, type ApiLotteryDraw } from "@/lib/api/lottery";
import type { TableColumn } from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  glo: "Official (GLO)",
  archive: "Archive",
  sanook: "Sanook",
  manual: "Manual",
};

const columns: TableColumn<ApiLotteryDraw>[] = [
  {
    key: "draw_date",
    header: "Draw Date",
    className: "whitespace-nowrap",
    render: (row) => <span className="font-medium">{row.draw_date}</span>,
  },
  {
    key: "three_up",
    header: "3D",
    className: "whitespace-nowrap",
    render: (row) => (
      <span className="font-mono text-base font-semibold tracking-[0.15em] text-[var(--color-primary)]">
        {row.three_up}
      </span>
    ),
  },
  {
    key: "two_down",
    header: "2D",
    className: "whitespace-nowrap",
    render: (row) => <span className="font-mono">{row.two_down ?? "—"}</span>,
  },
  {
    key: "source",
    header: "Source",
    className: "whitespace-nowrap",
    render: (row) => (
      <span className="text-[var(--color-muted-foreground)]">
        {SOURCE_LABELS[row.source] ?? row.source}
      </span>
    ),
  },
];

export function UserThreeDHistoryScreen() {
  const [draws, setDraws] = useState<ApiLotteryDraw[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getLotteryDraws(1)
      .then((response) => {
        if (!active) return;
        setDraws(response.results);
        setTotal(response.count);
        setHasNext(Boolean(response.next));
      })
      .catch(() => {
        if (active) setError("Unable to load draw history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const response = await getLotteryDraws(next);
      setDraws((current) => [...current, ...response.results]);
      setHasNext(Boolean(response.next));
      setPage(next);
    } catch {
      setError("Unable to load more draws.");
    } finally {
      setLoadingMore(false);
    }
  }

  const latest = draws[0];

  return (
    <div className="space-y-6">
      <PageHero>
        <p className="text-sm font-medium text-white/80">Thai Draw History</p>
        {latest ? (
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <p className="w-full text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
              Latest draw · {latest.draw_date}
            </p>
            <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
                3D
              </p>
              <p className="mt-1 font-mono text-4xl font-semibold tracking-[0.3em]">
                {latest.three_up}
              </p>
            </div>
            <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
                2D
              </p>
              <p className="mt-1 font-mono text-4xl font-semibold tracking-[0.3em]">
                {latest.two_down ?? "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/80">
            Official Thai lottery results — the 3D (last 3 digits of the first
            prize) and 2D (two-down) numbers.
          </p>
        )}
      </PageHero>

      {error ? (
        <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatTile label="Draws on record" value={total ? total.toLocaleString() : "—"} />
        <StatTile label="Loaded" value={draws.length.toLocaleString()} />
      </section>

      {loading ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          Loading draw history…
        </div>
      ) : draws.length === 0 ? (
        <EmptyState
          title="No draw results yet"
          description="Official draw results will appear here once they are imported."
        />
      ) : (
        <>
          <DataTable
            title="Past Draws"
            description="Newest first — official Thai 3D and 2D numbers for each draw date."
            columns={columns}
            rows={draws}
            tableClassName="min-w-[560px]"
          />
          {hasNext ? (
            <div>
              <ActionButton variant="secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </ActionButton>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
