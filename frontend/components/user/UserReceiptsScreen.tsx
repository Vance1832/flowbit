"use client";

import { useMemo, useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatTile } from "@/components/ui/StatTile";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMmk, useUserApp, type UserReceipt } from "@/components/providers/UserAppProvider";
import { UserPageHeader } from "@/components/user/UserPrimitives";
import { downloadReceiptPdf } from "@/lib/api/receipts";
import {
  currentMonthString,
  todayDateString,
  weekStartDateString,
} from "@/lib/format";
import type { TableColumn } from "@/lib/types";

export function UserReceiptsScreen() {
  const t = useTranslations();
  const { receipts } = useUserApp();

  // Option `value`s stay in English to match the provider's data; only the
  // displayed labels are localized.
  const statusOptions = [
    { label: t("filters.all"), value: "All" },
    { label: t("filters.pending"), value: "Pending" },
    { label: t("filters.paid"), value: "Paid" },
    { label: t("filters.voided"), value: "Voided" },
  ];
  const dateOptions = [
    { label: t("filters.allDates"), value: "All Dates" },
    { label: t("filters.today"), value: "Today" },
    { label: t("filters.thisWeek"), value: "This Week" },
    { label: t("filters.thisMonth"), value: "This Month" },
  ];
  const receiptStats = useMemo(
    () => ({
      total: receipts.length,
      paid: receipts.filter((receipt) => receipt.status === "Paid").length,
      submitted: receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0),
    }),
    [receipts],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Dates");

  const periodOptions = useMemo(() => {
    const periods = Array.from(
      new Set(receipts.map((receipt) => receipt.period).filter(Boolean)),
    ).sort();
    return [
      { label: t("filters.all"), value: "All" },
      ...periods.map((period) => ({ label: period, value: period })),
    ];
  }, [receipts, t]);
  const [selectedReceipt, setSelectedReceipt] = useState<UserReceipt | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  async function handleDownload(receipt: UserReceipt) {
    setDownloadError("");
    setDownloadingId(receipt.id);
    try {
      await downloadReceiptPdf(receipt.id, receipt.receiptNo);
    } catch {
      setDownloadError(t("receipts.downloadError"));
    } finally {
      setDownloadingId(null);
    }
  }

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        receipt.receiptNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || receipt.status === statusFilter;
      const matchesPeriod = periodFilter === "All" || receipt.period === periodFilter;
      const matchesDate =
        dateFilter === "All Dates" ||
        (dateFilter === "Today" && receipt.createdAt.startsWith(todayDateString())) ||
        (dateFilter === "This Week" &&
          receipt.createdAt.slice(0, 10) >= weekStartDateString()) ||
        (dateFilter === "This Month" &&
          receipt.createdAt.startsWith(currentMonthString()));
      return matchesSearch && matchesStatus && matchesPeriod && matchesDate;
    });
  }, [dateFilter, periodFilter, receipts, searchTerm, statusFilter]);

  const columns: TableColumn<UserReceipt>[] = [
    {
      key: "receiptNo",
      header: t("receipts.colReceiptNo"),
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.receiptNo}</span>,
    },
    {
      key: "period",
      header: t("receipts.colPeriod"),
      className: "whitespace-nowrap",
      render: (row) => row.period,
    },
    {
      key: "totalAmount",
      header: t("receipts.colTotalAmount"),
      className: "whitespace-nowrap",
      render: (row) => formatMmk(row.totalAmount),
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={row.status === "Paid" ? "success" : row.status === "Pending" ? "warning" : "danger"}>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: "createdAt",
      header: t("receipts.colCreatedAt"),
      className: "whitespace-nowrap",
      render: (row) => row.createdAt,
    },
    {
      key: "actions",
      header: t("receipts.colActions"),
      className: "whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            onClick={() => setSelectedReceipt(row)}
          >
            {t("common.view")}
          </button>
          <button
            type="button"
            disabled={downloadingId === row.id}
            className="text-sm font-semibold text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 disabled:opacity-50"
            onClick={() => handleDownload(row)}
          >
            {downloadingId === row.id ? t("receipts.downloading") : t("receipts.download")}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <UserPageHeader title={t("receipts.title")} />

        <section className="grid grid-cols-3 gap-3">
          <StatTile label={t("receipts.totalReceipts")} value={String(receiptStats.total)} />
          <StatTile label={t("receipts.paid")} value={String(receiptStats.paid)} />
          <StatTile label={t("receipts.totalSubmitted")} value={formatMmk(receiptStats.submitted)} />
        </section>

        {downloadError ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {downloadError}
          </div>
        ) : null}

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <SearchInput
              placeholder={t("receipts.searchPlaceholder")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <DropdownFilter
              label={t("common.status")}
              options={statusOptions}
              selectedValue={statusFilter}
              onChange={setStatusFilter}
            />
            <DropdownFilter
              label={t("receipts.resultPeriod")}
              options={periodOptions}
              selectedValue={periodFilter}
              onChange={setPeriodFilter}
            />
            <DropdownFilter
              label={t("common.date")}
              options={dateOptions}
              selectedValue={dateFilter}
              onChange={setDateFilter}
            />
          </div>
        </FilterBar>

        <DataTable
          title={t("receipts.title")}
          description={t("receipts.tableDesc")}
          columns={columns}
          rows={filteredReceipts}
          tableClassName="min-w-[920px]"
        />
      </div>

      <DetailDrawer
        open={selectedReceipt !== null}
        title={
          selectedReceipt
            ? t("receipts.detailTitle", { no: selectedReceipt.receiptNo })
            : t("receipts.receiptDetail")
        }
        subtitle={t("receipts.detailSubtitle")}
        onClose={() => setSelectedReceipt(null)}
      >
        {selectedReceipt ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [t("receipts.colReceiptNo"), selectedReceipt.receiptNo],
                [t("receipts.colPeriod"), selectedReceipt.period],
                [t("receipts.colTotalAmount"), formatMmk(selectedReceipt.totalAmount)],
                [t("common.status"), selectedReceipt.status],
                [t("receipts.colCreatedAt"), selectedReceipt.createdAt],
                [t("receipts.walletTransaction"), selectedReceipt.walletTransaction],
                [t("receipts.paymentStatus"), selectedReceipt.paymentStatus],
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

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{t("receipts.items")}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--color-border)]">
                  <thead className="bg-[var(--color-surface-muted)]">
                    <tr>
                      {[
                        t("receipts.itemNumber"),
                        t("common.amount"),
                        t("receipts.itemR"),
                        t("receipts.generatedNumbers"),
                        t("receipts.itemTotal"),
                      ].map((header) => (
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
                          {item.useR ? t("receipts.yes") : t("receipts.no")}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                          {item.generatedNumbers.length > 0 ? item.generatedNumbers.join(", ") : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[var(--color-foreground)]">
                          {formatMmk(
                            item.amount * (item.useR ? item.generatedNumbers.length : 1),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="button"
              disabled={downloadingId === selectedReceipt.id}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-50"
              onClick={() => handleDownload(selectedReceipt)}
            >
              {downloadingId === selectedReceipt.id
                ? t("receipts.downloading")
                : t("receipts.downloadPdf")}
            </button>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
