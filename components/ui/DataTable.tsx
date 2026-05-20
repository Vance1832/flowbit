import type { ReactNode } from "react";

import type { TableColumn } from "@/lib/types";
import { cn } from "@/lib/utils";

type DataTableProps<T> = {
  title: string;
  description?: string;
  columns: TableColumn<T>[];
  rows: T[];
  actions?: ReactNode;
  emptyState?: ReactNode;
};

export function DataTable<T>({
  title,
  description,
  columns,
  rows,
  actions,
  emptyState,
}: DataTableProps<T>) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-3.5">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </div>

      {rows.length === 0 ? (
        <div className="p-6">{emptyState}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)]">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]",
                      column.className,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className="transition-colors hover:bg-[var(--color-surface-subtle)]"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-5 py-3.5 align-middle text-sm text-[var(--color-foreground)]",
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
