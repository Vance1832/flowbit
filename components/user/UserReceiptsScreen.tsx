"use client";

import { useMemo, useState } from "react";

import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMmk, useUserApp, type UserReceipt } from "@/components/providers/UserAppProvider";
import { UserPageHeader } from "@/components/user/UserPrimitives";
import type { TableColumn } from "@/lib/types";

const statusOptions = [
  { label: "All", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Paid", value: "Paid" },
  { label: "Voided", value: "Voided" },
];

const periodOptions = [
  { label: "All", value: "All" },
  { label: "TEST02", value: "TEST02" },
  { label: "JUNE01", value: "JUNE01" },
];

const dateOptions = [
  { label: "All Dates", value: "All Dates" },
  { label: "Today", value: "Today" },
  { label: "This Week", value: "This Week" },
  { label: "This Month", value: "This Month" },
];

export function UserReceiptsScreen() {
  const { receipts } = useUserApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [selectedReceipt, setSelectedReceipt] = useState<UserReceipt | null>(null);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        receipt.receiptNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || receipt.status === statusFilter;
      const matchesPeriod = periodFilter === "All" || receipt.period === periodFilter;
      const matchesDate =
        dateFilter === "All Dates" ||
        (dateFilter === "Today" && receipt.createdAt.startsWith("2026-06-30")) ||
        (dateFilter === "This Week" && receipt.createdAt.startsWith("2026-06")) ||
        (dateFilter === "This Month" && receipt.createdAt.startsWith("2026-06"));
      return matchesSearch && matchesStatus && matchesPeriod && matchesDate;
    });
  }, [dateFilter, periodFilter, receipts, searchTerm, statusFilter]);

  const columns: TableColumn<UserReceipt>[] = [
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
      render: (row) => formatMmk(row.totalAmount),
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={row.status === "Paid" ? "success" : row.status === "Pending" ? "warning" : "danger"}>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: "createdAt",
      header: "Created At",
      className: "whitespace-nowrap",
      render: (row) => row.createdAt,
    },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => setSelectedReceipt(row)}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <UserPageHeader
          title="Receipts"
          subtitle="Review submitted receipts and payment status."
        />

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <SearchInput
              placeholder="Search receipt number"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <DropdownFilter
              label="Status"
              options={statusOptions}
              selectedValue={statusFilter}
              onChange={setStatusFilter}
            />
            <DropdownFilter
              label="Result Period"
              options={periodOptions}
              selectedValue={periodFilter}
              onChange={setPeriodFilter}
            />
            <DropdownFilter
              label="Date"
              options={dateOptions}
              selectedValue={dateFilter}
              onChange={setDateFilter}
            />
          </div>
        </FilterBar>

        <DataTable
          title="Receipts"
          description="Submitted receipt records for your account."
          columns={columns}
          rows={filteredReceipts}
          tableClassName="min-w-[920px]"
        />
      </div>

      <DetailDrawer
        open={selectedReceipt !== null}
        title={selectedReceipt ? `Receipt ${selectedReceipt.receiptNo}` : "Receipt Detail"}
        subtitle="Review selected numbers and wallet payment details."
        onClose={() => setSelectedReceipt(null)}
      >
        {selectedReceipt ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Receipt No", selectedReceipt.receiptNo],
                ["Period", selectedReceipt.period],
                ["Total Amount", formatMmk(selectedReceipt.totalAmount)],
                ["Status", selectedReceipt.status],
                ["Created At", selectedReceipt.createdAt],
                ["Wallet Transaction", selectedReceipt.walletTransaction],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Items</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--color-border)]">
                  <thead className="bg-[var(--color-surface-muted)]">
                    <tr>
                      {["Number", "Amount", "R", "Generated Numbers"].map((header) => (
                        <th
                          key={header}
                          className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-muted-foreground)]"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {selectedReceipt.items.map((item, index) => (
                      <tr key={`${item.number}-${index}`}>
                        <td className="px-4 py-3.5 text-sm font-medium text-[var(--color-foreground)]">
                          {item.number}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[var(--color-foreground)]">
                          {formatMmk(item.amount)}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[var(--color-foreground)]">
                          {item.useR ? "Yes" : "No"}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                          {item.generatedNumbers.length > 0 ? item.generatedNumbers.join(", ") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
