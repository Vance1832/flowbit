"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  getUserResultOverview,
  type ApiUserCurrentResultPeriod,
  type ApiUserLatestVisibleResult,
  type ApiUserVisibleResult,
} from "@/lib/api/ledgers";
import { changePassword } from "@/lib/api/accounts";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api/notifications";
import { getMyReceipts, submitReceipt as submitReceiptRequest, type ApiReceipt } from "@/lib/api/receipts";
import { ensureResults } from "@/lib/api/types";
import {
  createDepositRequest,
  createWithdrawalRequest,
  getMyDepositRequests,
  getMyWallet,
  getMyWalletTransactions,
  getMyWithdrawalRequests,
  type ApiDepositRequest,
  type ApiWallet,
  type ApiWalletTransaction,
  type ApiWithdrawalRequest,
} from "@/lib/api/wallets";
import { formatDateTime } from "@/lib/format";

export type UserNotificationType =
  | "Deposit"
  | "Withdrawal"
  | "Receipt"
  | "Result"
  | "Wallet";

export type UserReceiptItem = {
  number: string;
  amount: number;
  useR: boolean;
  generatedNumbers: string[];
};

export type UserReceipt = {
  id: string;
  receiptNo: string;
  period: string;
  totalAmount: number;
  status: "Pending" | "Paid" | "Voided";
  paymentStatus: "Pending" | "Paid" | "Voided";
  createdAt: string;
  walletTransaction: string;
  items: UserReceiptItem[];
};

export type UserWalletTransaction = {
  id: string;
  type: string;
  amount: number | null;
  balanceAfter: number | null;
  description: string;
  date: string;
  status: string;
  reference: string;
};

export type UserNotification = {
  id: string;
  type: UserNotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

export type UserResult = {
  id: string;
  period: string;
  resultDate: string;
  resultNumber: string;
  status: "Settled";
  myReceiptStatus: "No Match" | "No Receipt" | "Matched";
  matchedReceiptNo?: string;
  matchedNumber?: string;
  matchedAmount?: number;
  settlementAmount?: number;
  walletCreditStatus?: "Credited" | "Pending";
};

export type UserProfile = {
  name: string;
  phone: string;
  email: string;
  role: "User";
  status: "Active";
  phoneVerified: boolean;
  emailVerified: boolean;
};

export type UserWalletRequest = {
  id: string;
  type: "Deposit" | "Withdrawal";
  amount: number;
  method: "WavePay" | "KPay" | "Bank Transfer";
  referenceOrAccount: string;
  status: "Pending" | "Approved" | "Rejected" | "Paid";
  createdAt: string;
  note?: string;
};

type DepositRequestInput = {
  amount: number;
  paymentMethod: "WavePay" | "KPay" | "Bank Transfer";
  senderAccountName: string;
  transactionReference: string;
  userNote: string;
  proofImage?: File | null;
};

type WithdrawalRequestInput = {
  amount: number;
  paymentMethod: "WavePay" | "KPay" | "Bank Transfer";
  accountHolderName: string;
  accountNumber: string;
  userNote: string;
};

type SubmitReceiptInput = {
  period: string;
  items: UserReceiptItem[];
};

type UserAppContextValue = {
  loading: boolean;
  error: string;
  availableBalance: number;
  lockedBalance: number;
  pendingDeposit: number;
  pendingWithdrawal: number;
  receipts: UserReceipt[];
  walletTransactions: UserWalletTransaction[];
  walletRequests: UserWalletRequest[];
  activity: UserWalletTransaction[];
  notifications: UserNotification[];
  currentPeriod: {
    code: string;
    status: "Open";
    bettingOpen: boolean;
    pendingMask: string;
    resultDate: string;
    closesAt: string;
    closesIn: string;
  } | null;
  latestVisibleResult: {
    code: string;
    resultDate: string;
    resultNumber: string;
    visibleUntil: string;
  } | null;
  pastResults: UserResult[];
  profile: UserProfile;
  unreadCount: number;
  refresh: () => Promise<void>;
  submitDepositRequest: (input: DepositRequestInput) => Promise<void>;
  submitWithdrawalRequest: (input: WithdrawalRequestInput) => Promise<void>;
  submitReceipt: (input: SubmitReceiptInput) => Promise<UserReceipt>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  updateProfile: (input: Pick<UserProfile, "name" | "phone" | "email">) => void;
  updatePassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
};

const UserAppContext = createContext<UserAppContextValue | null>(null);

function buildRelatedNumbers(value: string) {
  const chars = value.split("");
  const combinations = new Set<string>();

  function permute(prefix: string[], remaining: string[]) {
    if (remaining.length === 0) {
      combinations.add(prefix.join(""));
      return;
    }

    remaining.forEach((char, index) => {
      permute(
        [...prefix, char],
        remaining.filter((_, innerIndex) => innerIndex !== index),
      );
    });
  }

  permute([], chars);
  return [...combinations].sort();
}

function mapReceiptStatus(status: string): "Pending" | "Paid" | "Voided" {
  if (status === "voided") return "Voided";
  if (status === "paid") return "Paid";
  return "Pending";
}

function mapWalletRequestStatus(status: string): "Pending" | "Approved" | "Rejected" | "Paid" {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "paid":
      return "Paid";
    default:
      return "Pending";
  }
}

function mapNotificationType(type: string): UserNotificationType {
  switch (type) {
    case "deposit":
      return "Deposit";
    case "withdrawal":
      return "Withdrawal";
    case "result":
      return "Result";
    case "settlement":
      return "Wallet";
    default:
      return "Wallet";
  }
}

function mapWalletTransactionType(type: string) {
  switch (type) {
    case "deposit":
      return "Deposit Approved";
    case "withdrawal":
      return "Withdrawal Paid";
    case "number_payment":
      return "Receipt Payment";
    case "settlement_credit":
      return "Settlement Credit";
    case "refund":
      return "Refund";
    default:
      return type
        .split("_")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function mapWalletTransactionStatus(type: string) {
  switch (type) {
    case "number_payment":
      return "Paid";
    case "withdrawal":
    case "deposit":
    case "settlement_credit":
      return "Completed";
    default:
      return "Completed";
  }
}

function getWalletTransactionReference(tx: ApiWalletTransaction) {
  if (tx.reference_table === "receipts" && tx.reference_id) {
    return `Receipt #${tx.reference_id}`;
  }
  if (tx.reference_table === "deposit_requests" && tx.reference_id) {
    return `Deposit #${tx.reference_id}`;
  }
  if (tx.reference_table === "withdrawal_requests" && tx.reference_id) {
    return `Withdrawal #${tx.reference_id}`;
  }
  if (tx.reference_table === "settlement_items" && tx.reference_id) {
    return `Settlement #${tx.reference_id}`;
  }
  return "—";
}

function mapReceipt(receipt: ApiReceipt): UserReceipt {
  return {
    id: String(receipt.id),
    receiptNo: receipt.receipt_no,
    period: receipt.result_period_code ?? String(receipt.result_period),
    totalAmount: Number(receipt.total_amount),
    status: mapReceiptStatus(receipt.status),
    paymentStatus: mapReceiptStatus(receipt.status),
    createdAt: formatDateTime(receipt.created_at),
    walletTransaction: `Receipt ${receipt.receipt_no}`,
    items: receipt.items.map((item) => ({
      number: item.number_code,
      amount: Number(item.amount),
      useR: item.is_generated_by_r,
      generatedNumbers: item.is_generated_by_r ? buildRelatedNumbers(item.number_code) : [],
    })),
  };
}

function mapCurrentPeriod(period: ApiUserCurrentResultPeriod | null) {
  if (!period) return null;

  // Prefer the authoritative ledger close time when betting is open; fall back
  // to the period's nominal close time otherwise (e.g. window already elapsed).
  const closeDate = period.betting_closes_at
    ? new Date(period.betting_closes_at)
    : new Date(`${period.result_date}T${period.default_close_time.slice(0, 5)}:00`);
  const closesAt = period.betting_closes_at
    ? closeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    : period.default_close_time.slice(0, 5);
  const now = new Date();
  const diffMs = closeDate.getTime() - now.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const diffMinutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

  return {
    code: period.code,
    status: "Open" as const,
    bettingOpen: period.betting_open,
    pendingMask: "*** - ***",
    resultDate: period.result_date,
    closesAt,
    closesIn: `${diffHours}h ${diffMinutes}m`,
  };
}

function mapLatestVisibleResult(result: ApiUserLatestVisibleResult | null) {
  if (!result) return null;

  return {
    code: result.code,
    resultDate: result.result_date,
    resultNumber: result.result_number,
    visibleUntil: formatDateTime(result.visible_until),
  };
}

function mapUserResult(result: ApiUserVisibleResult): UserResult {
  return {
    id: `${result.period_code ?? result.result_date}-${result.result_number}`,
    period: result.period_code ?? "—",
    resultDate: result.result_date,
    resultNumber: result.result_number,
    status: "Settled",
    myReceiptStatus:
      result.my_receipt_status === "Matched"
        ? "Matched"
        : result.my_receipt_status === "No Match"
          ? "No Match"
          : "No Receipt",
    matchedReceiptNo: result.matched_receipt_no ?? undefined,
    matchedNumber: result.matched_number ?? undefined,
    matchedAmount: result.matched_amount ? Number(result.matched_amount) : undefined,
    settlementAmount: result.settlement_amount ? Number(result.settlement_amount) : undefined,
    walletCreditStatus:
      result.wallet_credit_status === "paid" ? "Credited" : result.wallet_credit_status ? "Pending" : undefined,
  };
}

function formatMmk(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}MMK ${Math.abs(value).toLocaleString("en-US")}`;
}

export function UserAppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [transactions, setTransactions] = useState<ApiWalletTransaction[]>([]);
  const [depositRequests, setDepositRequests] = useState<ApiDepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<ApiWithdrawalRequest[]>([]);
  const [receipts, setReceipts] = useState<UserReceipt[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<UserAppContextValue["currentPeriod"]>(null);
  const [latestVisibleResult, setLatestVisibleResult] =
    useState<UserAppContextValue["latestVisibleResult"]>(null);
  const [pastResults, setPastResults] = useState<UserResult[]>([]);
  const [profileDraft, setProfileDraft] = useState<{ name: string; email: string | null } | null>(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [
        walletResponse,
        transactionResponse,
        depositResponse,
        withdrawalResponse,
        receiptResponse,
        notificationResponse,
        resultOverview,
      ] = await Promise.all([
        getMyWallet(),
        getMyWalletTransactions(),
        getMyDepositRequests(),
        getMyWithdrawalRequests(),
        getMyReceipts(),
        getNotifications(),
        getUserResultOverview(),
      ]);

      setWallet(walletResponse);
      setTransactions(ensureResults(transactionResponse));
      setDepositRequests(ensureResults(depositResponse));
      setWithdrawalRequests(ensureResults(withdrawalResponse));
      setReceipts(ensureResults(receiptResponse).map(mapReceipt));
      setNotifications(
        ensureResults(notificationResponse).map((item) => ({
          id: String(item.id),
          type: mapNotificationType(item.notification_type),
          title: item.title,
          message: item.message,
          time: formatDateTime(item.created_at),
          read: item.is_read,
        })),
      );
      setCurrentPeriod(mapCurrentPeriod(resultOverview.current_open_period));
      setLatestVisibleResult(mapLatestVisibleResult(resultOverview.latest_visible_result));
      setPastResults(resultOverview.recent_results.map(mapUserResult));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load user data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const profile = useMemo<UserProfile>(() => {
    const name = profileDraft?.name ?? user?.name ?? "";
    const email = profileDraft?.email ?? user?.email ?? "";
    return {
      name,
      phone: user?.phone ?? "",
      email,
      role: "User",
      status: "Active",
      phoneVerified: user?.phone_verified ?? false,
      emailVerified: user?.email_verified ?? false,
    };
  }, [profileDraft?.email, profileDraft?.name, user]);

  const walletTransactions = useMemo<UserWalletTransaction[]>(() => {
    return transactions.map((tx) => ({
      id: String(tx.id),
      type: mapWalletTransactionType(tx.transaction_type),
      reference: getWalletTransactionReference(tx),
      amount: Number(tx.amount),
      balanceAfter: Number(tx.balance_after),
      description: tx.description ?? "—",
      date: formatDateTime(tx.created_at),
      status: mapWalletTransactionStatus(tx.transaction_type),
    }));
  }, [transactions]);

  const walletRequests = useMemo<UserWalletRequest[]>(() => {
    const mappedDeposits: UserWalletRequest[] = depositRequests.map((request) => ({
      id: `deposit-${request.id}`,
      type: "Deposit",
      amount: Number(request.amount),
      method: (request.payment_method as UserWalletRequest["method"]) ?? "WavePay",
      referenceOrAccount: request.transaction_reference ?? `Deposit #${request.id}`,
      status: mapWalletRequestStatus(request.status),
      createdAt: formatDateTime(request.created_at),
      note: request.user_note ?? undefined,
    }));

    const mappedWithdrawals: UserWalletRequest[] = withdrawalRequests.map((request) => ({
      id: `withdrawal-${request.id}`,
      type: "Withdrawal",
      amount: Number(request.amount),
      method: (request.payment_method as UserWalletRequest["method"]) ?? "WavePay",
      referenceOrAccount: request.payment_account_number ?? `Withdrawal #${request.id}`,
      status: mapWalletRequestStatus(request.status),
      createdAt: formatDateTime(request.created_at),
      note: request.user_note ?? undefined,
    }));

    return [...mappedDeposits, ...mappedWithdrawals].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }, [depositRequests, withdrawalRequests]);

  const activity = useMemo<UserWalletTransaction[]>(() => {
    const rows = [...walletTransactions];

    if (currentPeriod) {
      rows.unshift({
        id: `period-${currentPeriod.code}`,
        type: "Result Period Open",
        reference: currentPeriod.code,
        amount: null,
        balanceAfter: null,
        description: `Result period ${currentPeriod.code} is open.`,
        date: `${currentPeriod.resultDate} ${currentPeriod.closesAt}`,
        status: "Open",
      });
    }

    if (!currentPeriod && latestVisibleResult) {
      rows.unshift({
        id: `result-${latestVisibleResult.code}`,
        type: "Latest Result",
        reference: latestVisibleResult.code,
        amount: null,
        balanceAfter: null,
        description: `Result ${latestVisibleResult.resultNumber} is visible until ${latestVisibleResult.visibleUntil}.`,
        date: latestVisibleResult.resultDate,
        status: "Published",
      });
    }

    return rows.slice(0, 6);
  }, [currentPeriod, latestVisibleResult, walletTransactions]);

  const availableBalance = Number(wallet?.balance ?? 0);
  const lockedBalance = Number(wallet?.locked_balance ?? 0);
  const pendingDeposit = depositRequests
    .filter((request) => request.status === "pending" || request.status === "in_review")
    .reduce((sum, request) => sum + Number(request.amount), 0);
  const pendingWithdrawal = withdrawalRequests
    .filter((request) => request.status === "pending" || request.status === "approved")
    .reduce((sum, request) => sum + Number(request.amount), 0);

  const value = useMemo<UserAppContextValue>(
    () => ({
      loading,
      error,
      availableBalance,
      lockedBalance,
      pendingDeposit,
      pendingWithdrawal,
      receipts,
      walletTransactions,
      walletRequests,
      activity,
      notifications,
      currentPeriod,
      latestVisibleResult,
      pastResults,
      profile,
      unreadCount: notifications.filter((item) => !item.read).length,
      refresh,
      submitDepositRequest: async (input) => {
        await createDepositRequest({
          amount: input.amount,
          payment_method: input.paymentMethod,
          sender_account_name: input.senderAccountName,
          transaction_reference: input.transactionReference,
          user_note: input.userNote || undefined,
          proof_image: input.proofImage ?? undefined,
        });
        await refresh();
      },
      submitWithdrawalRequest: async (input) => {
        await createWithdrawalRequest({
          amount: input.amount,
          payment_method: input.paymentMethod,
          payment_account_name: input.accountHolderName,
          payment_account_number: input.accountNumber,
          user_note: input.userNote || undefined,
        });
        await refresh();
      },
      submitReceipt: async (input) => {
        const receipt = await submitReceiptRequest({
          result_period_code: input.period,
          items: input.items.map((item) => ({
            number_code: item.number,
            amount: item.amount,
            use_r: item.useR,
          })),
        });
        await refresh();
        return mapReceipt(receipt);
      },
      markNotificationAsRead: async (id) => {
        await markNotificationRead(Number(id));
        setNotifications((current) =>
          current.map((item) => (item.id === id ? { ...item, read: true } : item)),
        );
      },
      markAllNotificationsAsRead: async () => {
        await markAllNotificationsRead();
        setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      },
      updateProfile: (input) => {
        setProfileDraft({ name: input.name, email: input.email });
      },
      updatePassword: async (input) => {
        if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
          return { ok: false, error: "All password fields are required." };
        }
        if (input.newPassword !== input.confirmPassword) {
          return { ok: false, error: "New password and confirm password must match." };
        }
        try {
          await changePassword({
            current_password: input.currentPassword,
            new_password: input.newPassword,
            confirm_password: input.confirmPassword,
          });
          return { ok: true };
        } catch (err) {
          return {
            ok: false,
            error: err instanceof Error ? err.message : "Unable to change password.",
          };
        }
      },
    }),
    [
      activity,
      availableBalance,
      currentPeriod,
      error,
      latestVisibleResult,
      loading,
      lockedBalance,
      notifications,
      pastResults,
      pendingDeposit,
      pendingWithdrawal,
      profile,
      receipts,
      walletRequests,
      walletTransactions,
    ],
  );

  return <UserAppContext.Provider value={value}>{children}</UserAppContext.Provider>;
}

export function useUserApp() {
  const context = useContext(UserAppContext);
  if (!context) {
    throw new Error("useUserApp must be used within UserAppProvider");
  }
  return context;
}

export { formatMmk };
