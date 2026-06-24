"use client";

import { useMemo, useState } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { PageHero } from "@/components/ui/PageHero";
import { StatTile } from "@/components/ui/StatTile";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatMmk,
  useUserApp,
  type UserWalletRequest,
  type UserWalletTransaction,
} from "@/components/providers/UserAppProvider";
import {
  UserField,
  userInputClassName,
} from "@/components/user/UserPrimitives";
import type { TableColumn } from "@/lib/types";

type PaymentMethod = "WavePay" | "KPay" | "Bank Transfer";

const paymentMethodOptions = [
  { label: "WavePay", value: "WavePay" },
  { label: "KPay", value: "KPay" },
  { label: "Bank Transfer", value: "Bank Transfer" },
];

type Translate = ReturnType<typeof useTranslations>;

function buildTransactionColumns(t: Translate): TableColumn<UserWalletTransaction>[] {
  return [
    {
      key: "type",
      header: t("common.type"),
      className: "min-w-[180px] whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.type}</span>,
    },
    {
      key: "amount",
      header: t("common.amount"),
      className: "whitespace-nowrap",
      render: (row) => (row.amount === null ? "—" : formatMmk(row.amount)),
    },
    {
      key: "balanceAfter",
      header: t("wallet.colBalanceAfter"),
      className: "whitespace-nowrap",
      render: (row) => (row.balanceAfter === null ? "—" : formatMmk(row.balanceAfter)),
    },
    {
      key: "description",
      header: t("wallet.colDescription"),
      className: "min-w-[220px]",
      render: (row) => row.description,
    },
    {
      key: "date",
      header: t("common.date"),
      className: "whitespace-nowrap",
      render: (row) => row.date,
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge
          status={
            row.status === "Completed" || row.status === "Paid"
              ? "success"
              : row.status === "Pending"
                ? "warning"
                : "neutral"
          }
        >
          {row.status}
        </StatusBadge>
      ),
    },
  ];
}

function buildRequestColumns(
  t: Translate,
  onView: (row: UserWalletRequest) => void,
): TableColumn<UserWalletRequest>[] {
  return [
    {
      key: "type",
      header: t("common.type"),
      className: "whitespace-nowrap",
      render: (row) => row.type,
    },
    {
      key: "amount",
      header: t("common.amount"),
      className: "whitespace-nowrap",
      render: (row) => formatMmk(row.amount),
    },
    {
      key: "method",
      header: t("wallet.colMethod"),
      className: "whitespace-nowrap",
      render: (row) => row.method,
    },
    {
      key: "referenceOrAccount",
      header: t("wallet.colReferenceAccount"),
      className: "min-w-[180px] whitespace-nowrap",
      render: (row) => row.referenceOrAccount,
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge
          status={
            row.status === "Approved" || row.status === "Paid"
              ? "success"
              : row.status === "Pending"
                ? "warning"
                : "danger"
          }
        >
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: "createdAt",
      header: t("wallet.colCreatedAt"),
      className: "whitespace-nowrap",
      render: (row) => row.createdAt,
    },
    {
      key: "action",
      header: t("common.action"),
      className: "whitespace-nowrap",
      render: (row) => (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => onView(row)}
        >
          {t("common.view")}
        </button>
      ),
    },
  ];
}

export function UserWalletScreen() {
  const t = useTranslations();
  const {
    loading,
    error: providerError,
    availableBalance,
    lockedBalance,
    pendingDeposit,
    pendingWithdrawal,
    walletTransactions,
    walletRequests,
    submitDepositRequest,
    submitWithdrawalRequest,
  } = useUserApp();
  const [activeDrawer, setActiveDrawer] = useState<"deposit" | "withdraw" | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<UserWalletRequest | null>(null);
  const [depositForm, setDepositForm] = useState({
    amount: "",
    paymentMethod: "WavePay" as PaymentMethod,
    senderAccountName: "",
    transactionReference: "",
    userNote: "",
    proofImage: null as File | null,
  });
  // Bumped on reset to remount the (uncontrolled) file input so it clears.
  const [proofInputKey, setProofInputKey] = useState(0);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    paymentMethod: "WavePay" as PaymentMethod,
    accountHolderName: "",
    accountNumber: "",
    userNote: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const orderedTransactions = useMemo(() => {
    return [...walletTransactions].sort((left, right) => right.date.localeCompare(left.date));
  }, [walletTransactions]);

  const orderedRequests = useMemo(() => {
    return [...walletRequests].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [walletRequests]);

  const transactionColumns = useMemo(() => buildTransactionColumns(t), [t]);
  const requestsColumns = useMemo(
    () => buildRequestColumns(t, setSelectedRequest),
    [t],
  );

  function closeDrawer() {
    setActiveDrawer(null);
    setError("");
  }

  async function handleDepositSubmit() {
    const numericAmount = Number(depositForm.amount || 0);

    if (!numericAmount) {
      setError(t("wallet.amountRequired"));
      return;
    }
    if (numericAmount < 1000) {
      setError(t("wallet.minDeposit"));
      return;
    }
    if (!depositForm.transactionReference.trim()) {
      setError(t("wallet.refRequired"));
      return;
    }
    if (depositForm.proofImage && depositForm.proofImage.size > 5 * 1024 * 1024) {
      setError(t("wallet.proofTooLarge"));
      return;
    }

    try {
      await submitDepositRequest({
        amount: numericAmount,
        paymentMethod: depositForm.paymentMethod,
        senderAccountName: depositForm.senderAccountName,
        transactionReference: depositForm.transactionReference,
        userNote: depositForm.userNote,
        proofImage: depositForm.proofImage,
      });
      setMessage(t("wallet.depositSuccess"));
      setDepositForm({
        amount: "",
        paymentMethod: "WavePay",
        senderAccountName: "",
        transactionReference: "",
        userNote: "",
        proofImage: null,
      });
      setProofInputKey((key) => key + 1);
      closeDrawer();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("wallet.depositFailed"));
    }
  }

  async function handleWithdrawalSubmit() {
    const numericAmount = Number(withdrawalForm.amount || 0);

    if (!numericAmount) {
      setError(t("wallet.amountRequired"));
      return;
    }
    if (numericAmount < 1000) {
      setError(t("wallet.minWithdrawal"));
      return;
    }
    if (numericAmount > availableBalance) {
      setError(t("wallet.exceedsBalance"));
      return;
    }

    try {
      await submitWithdrawalRequest({
        amount: numericAmount,
        paymentMethod: withdrawalForm.paymentMethod,
        accountHolderName: withdrawalForm.accountHolderName,
        accountNumber: withdrawalForm.accountNumber,
        userNote: withdrawalForm.userNote,
      });
      setMessage(t("wallet.withdrawalSuccess"));
      setWithdrawalForm({
        amount: "",
        paymentMethod: "WavePay",
        accountHolderName: "",
        accountNumber: "",
        userNote: "",
      });
      closeDrawer();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("wallet.withdrawalFailed"));
    }
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero>
          <p className="text-sm font-medium text-white/80">{t("wallet.title")}</p>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
            {t("wallet.availableBalance")}
          </p>
          <p className="mt-1 text-[34px] font-semibold tracking-tight">
            {formatMmk(availableBalance)}
          </p>
        </PageHero>

        {message ? (
          <div className="rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            {message}
          </div>
        ) : null}

        {providerError ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {providerError}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            {t("wallet.loadingData")}
          </div>
        ) : null}

        <section className="grid grid-cols-3 gap-3">
          <StatTile label={t("wallet.lockedBalance")} value={formatMmk(lockedBalance)} />
          <StatTile label={t("wallet.pendingDeposits")} value={formatMmk(pendingDeposit)} tone="positive" />
          <StatTile label={t("wallet.pendingWithdrawals")} value={formatMmk(pendingWithdrawal)} tone="negative" />
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton className="h-11 rounded-xl px-5" onClick={() => setActiveDrawer("deposit")}>
              {t("wallet.deposit")}
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="h-11 rounded-xl px-5"
              onClick={() => setActiveDrawer("withdraw")}
            >
              {t("wallet.withdraw")}
            </ActionButton>
          </div>
        </section>

        <DataTable
          title={t("wallet.transactionsTitle")}
          description={t("wallet.transactionsDesc")}
          columns={transactionColumns}
          rows={orderedTransactions}
          tableClassName="min-w-[980px]"
        />

        <DataTable
          title={t("wallet.requestsTitle")}
          description={t("wallet.requestsDesc")}
          columns={requestsColumns}
          rows={orderedRequests}
          tableClassName="min-w-[980px]"
        />
      </div>

      <DetailDrawer
        open={activeDrawer === "deposit"}
        title={t("wallet.depositTitle")}
        subtitle={t("wallet.depositSubtitle")}
        onClose={closeDrawer}
      >
        <div className="space-y-5">
          <UserField label={t("wallet.amount")}>
            <input
              value={depositForm.amount}
              onChange={(event) =>
                setDepositForm((current) => ({ ...current, amount: event.target.value.replace(/[^\d]/g, "") }))
              }
              className={userInputClassName}
              placeholder={t("wallet.amountPlaceholder")}
            />
          </UserField>
          <UserField label={t("wallet.paymentMethod")}>
            <DropdownFilter
              label={t("wallet.paymentMethod")}
              options={paymentMethodOptions}
              selectedValue={depositForm.paymentMethod}
              onChange={(value) =>
                setDepositForm((current) => ({ ...current, paymentMethod: value as PaymentMethod }))
              }
            />
          </UserField>
          <UserField label={t("wallet.senderAccountName")}>
            <input
              value={depositForm.senderAccountName}
              onChange={(event) =>
                setDepositForm((current) => ({ ...current, senderAccountName: event.target.value }))
              }
              className={userInputClassName}
              placeholder={t("wallet.senderAccountPlaceholder")}
            />
          </UserField>
          <UserField label={t("wallet.transactionReference")}>
            <input
              value={depositForm.transactionReference}
              onChange={(event) =>
                setDepositForm((current) => ({ ...current, transactionReference: event.target.value }))
              }
              className={userInputClassName}
              placeholder={t("wallet.transactionReferencePlaceholder")}
            />
          </UserField>
          <UserField label={t("wallet.proofImage")}>
            <div className="space-y-2">
              <input
                key={proofInputKey}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(event) =>
                  setDepositForm((current) => ({
                    ...current,
                    proofImage: event.target.files?.[0] ?? null,
                  }))
                }
                className="block w-full rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--color-primary-strong)]"
              />
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {t("wallet.proofHint")}
              </p>
            </div>
          </UserField>
          <UserField label={t("wallet.userNote")}>
            <textarea
              value={depositForm.userNote}
              onChange={(event) => setDepositForm((current) => ({ ...current, userNote: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
              placeholder={t("wallet.notePlaceholder")}
            />
          </UserField>
          {error ? (
            <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
              {error}
            </div>
          ) : null}
          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-5">
            <ActionButton variant="secondary" onClick={closeDrawer}>
              {t("wallet.cancel")}
            </ActionButton>
            <ActionButton onClick={handleDepositSubmit}>{t("wallet.submitDeposit")}</ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={activeDrawer === "withdraw"}
        title={t("wallet.withdrawTitle")}
        subtitle={t("wallet.withdrawSubtitle")}
        onClose={closeDrawer}
      >
        <div className="space-y-5">
          <UserField label={t("wallet.amount")}>
            <input
              value={withdrawalForm.amount}
              onChange={(event) =>
                setWithdrawalForm((current) => ({ ...current, amount: event.target.value.replace(/[^\d]/g, "") }))
              }
              className={userInputClassName}
              placeholder={t("wallet.amountPlaceholder")}
            />
          </UserField>
          <UserField label={t("wallet.paymentMethod")}>
            <DropdownFilter
              label={t("wallet.paymentMethod")}
              options={paymentMethodOptions}
              selectedValue={withdrawalForm.paymentMethod}
              onChange={(value) =>
                setWithdrawalForm((current) => ({ ...current, paymentMethod: value as PaymentMethod }))
              }
            />
          </UserField>
          <UserField label={t("wallet.accountHolderName")}>
            <input
              value={withdrawalForm.accountHolderName}
              onChange={(event) =>
                setWithdrawalForm((current) => ({ ...current, accountHolderName: event.target.value }))
              }
              className={userInputClassName}
              placeholder={t("wallet.accountHolderPlaceholder")}
            />
          </UserField>
          <UserField label={t("wallet.accountNumberPhone")}>
            <input
              value={withdrawalForm.accountNumber}
              onChange={(event) =>
                setWithdrawalForm((current) => ({ ...current, accountNumber: event.target.value }))
              }
              className={userInputClassName}
              placeholder={t("wallet.accountNumberPlaceholder")}
            />
          </UserField>
          <UserField label={t("wallet.userNote")}>
            <textarea
              value={withdrawalForm.userNote}
              onChange={(event) =>
                setWithdrawalForm((current) => ({ ...current, userNote: event.target.value }))
              }
              className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30"
              placeholder={t("wallet.notePlaceholder")}
            />
          </UserField>
          {error ? (
            <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
              {error}
            </div>
          ) : null}
          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-5">
            <ActionButton variant="secondary" onClick={closeDrawer}>
              {t("wallet.cancel")}
            </ActionButton>
            <ActionButton onClick={handleWithdrawalSubmit}>{t("wallet.submitWithdrawal")}</ActionButton>
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={selectedRequest !== null}
        title={
          selectedRequest
            ? t("wallet.requestTitle", { type: selectedRequest.type })
            : t("wallet.walletRequest")
        }
        subtitle={t("wallet.requestDetail")}
        onClose={() => setSelectedRequest(null)}
      >
        {selectedRequest ? (
          <div className="space-y-4">
            {[
              [t("common.type"), selectedRequest.type],
              [t("common.amount"), formatMmk(selectedRequest.amount)],
              [t("wallet.colMethod"), selectedRequest.method],
              [t("wallet.colReferenceAccount"), selectedRequest.referenceOrAccount],
              [t("common.status"), selectedRequest.status],
              [t("wallet.colCreatedAt"), selectedRequest.createdAt],
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
        ) : null}
      </DetailDrawer>
    </>
  );
}
