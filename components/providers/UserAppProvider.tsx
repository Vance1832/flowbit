"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
    pendingMask: string;
    resultDate: string;
    closesAt: string;
    closesIn: string;
  };
  pastResults: UserResult[];
  profile: UserProfile;
  unreadCount: number;
  submitDepositRequest: (input: DepositRequestInput) => void;
  submitWithdrawalRequest: (input: WithdrawalRequestInput) => void;
  submitReceipt: (input: SubmitReceiptInput) => UserReceipt;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  updateProfile: (input: Pick<UserProfile, "name" | "phone" | "email">) => void;
  updatePassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => { ok: boolean; error?: string };
};

const UserAppContext = createContext<UserAppContextValue | null>(null);

const initialReceipts: UserReceipt[] = [
  {
    id: "receipt-1",
    receiptNo: "FB-TEST02-000001",
    period: "TEST02",
    totalAmount: 6000,
    status: "Paid",
    paymentStatus: "Paid",
    createdAt: "2026-06-30 10:45",
    walletTransaction: "Receipt FB-TEST02-000001",
    items: [
      {
        number: "124",
        amount: 3000,
        useR: false,
        generatedNumbers: [],
      },
      {
        number: "112",
        amount: 1000,
        useR: true,
        generatedNumbers: ["112", "121", "211"],
      },
    ],
  },
  {
    id: "receipt-2",
    receiptNo: "FB-JUNE01-000014",
    period: "JUNE01",
    totalAmount: 3000,
    status: "Paid",
    paymentStatus: "Paid",
    createdAt: "2026-06-01 11:20",
    walletTransaction: "Receipt FB-JUNE01-000014",
    items: [
      {
        number: "387",
        amount: 3000,
        useR: false,
        generatedNumbers: [],
      },
    ],
  },
];

const initialWalletTransactions: UserWalletTransaction[] = [
  {
    id: "wallet-1",
    type: "Deposit Approved",
    reference: "DEP-FLOW-001",
    amount: 50000,
    balanceAfter: 50000,
    description: "Deposit DEP-FLOW-001",
    date: "2026-06-30 10:40",
    status: "Completed",
  },
  {
    id: "wallet-2",
    type: "Receipt Payment",
    reference: "FB-TEST02-000001",
    amount: -6000,
    balanceAfter: 44000,
    description: "Receipt FB-TEST02-000001",
    date: "2026-06-30 10:45",
    status: "Paid",
  },
];

const initialWalletRequests: UserWalletRequest[] = [
  {
    id: "wallet-request-1",
    type: "Deposit",
    amount: 50000,
    method: "WavePay",
    referenceOrAccount: "DEP-FLOW-001",
    status: "Approved",
    createdAt: "2026-06-30 10:30",
    note: "Initial approved deposit",
  },
  {
    id: "wallet-request-2",
    type: "Withdrawal",
    amount: 10000,
    method: "WavePay",
    referenceOrAccount: "0912345678",
    status: "Pending",
    createdAt: "2026-06-30 11:00",
    note: "User withdrawal request",
  },
];

const initialActivity: UserWalletTransaction[] = [
  {
    id: "activity-1",
    type: "Deposit Approved",
    reference: "DEP-FLOW-001",
    amount: 50000,
    balanceAfter: null,
    description: "Deposit DEP-FLOW-001",
    date: "2026-06-30 10:40",
    status: "Completed",
  },
  {
    id: "activity-2",
    type: "Receipt Submitted",
    reference: "FB-TEST02-000001",
    amount: -6000,
    balanceAfter: null,
    description: "Receipt FB-TEST02-000001",
    date: "2026-06-30 10:45",
    status: "Paid",
  },
  {
    id: "activity-3",
    type: "Result Period Open",
    reference: "TEST02",
    amount: null,
    balanceAfter: null,
    description: "Result period TEST02 is open.",
    date: "2026-06-30 09:00",
    status: "Open",
  },
];

const initialNotifications: UserNotification[] = [
  {
    id: "user-notification-1",
    type: "Deposit",
    title: "Deposit Approved",
    message: "Deposit DEP-FLOW-001 was approved and added to your wallet.",
    time: "2026-06-30 10:40",
    read: false,
  },
  {
    id: "user-notification-2",
    type: "Receipt",
    title: "Receipt Submitted",
    message: "Receipt FB-TEST02-000001 was submitted successfully.",
    time: "2026-06-30 10:45",
    read: true,
  },
  {
    id: "user-notification-3",
    type: "Result",
    title: "Result Period Open",
    message: "TEST02 is open until 15:00.",
    time: "2026-06-30 09:00",
    read: false,
  },
  {
    id: "user-notification-4",
    type: "Wallet",
    title: "Wallet Updated",
    message: "Your available balance was updated to MMK 50,000.",
    time: "2026-06-30 10:40",
    read: true,
  },
  {
    id: "user-notification-5",
    type: "Withdrawal",
    title: "Withdrawal Pending",
    message: "Withdrawal request WD-REQ-1001 is pending review.",
    time: "2026-06-29 15:10",
    read: true,
  },
  {
    id: "user-notification-6",
    type: "Receipt",
    title: "Receipt Paid",
    message: "Receipt FB-JUNE01-000014 was paid from your wallet.",
    time: "2026-06-28 11:20",
    read: true,
  },
  {
    id: "user-notification-7",
    type: "Result",
    title: "Result Published",
    message: "JUNE01 result number 124 was published.",
    time: "2026-06-27 15:00",
    read: true,
  },
  {
    id: "user-notification-8",
    type: "Deposit",
    title: "Deposit Request Submitted",
    message: "Deposit request DEP-REQ-1002 was submitted for review.",
    time: "2026-06-26 14:30",
    read: true,
  },
];

const currentPeriod = {
  code: "TEST02",
  status: "Open" as const,
  pendingMask: "*** - ***",
  resultDate: "2026-06-30",
  closesAt: "15:00",
  closesIn: "4h 20m",
};

const initialPastResults: UserResult[] = [
  {
    id: "result-1",
    period: "JUNE01",
    resultDate: "2026-06-01",
    resultNumber: "124",
    status: "Settled",
    myReceiptStatus: "No Match",
  },
  {
    id: "result-2",
    period: "MAY16",
    resultDate: "2026-05-16",
    resultNumber: "387",
    status: "Settled",
    myReceiptStatus: "No Receipt",
  },
  {
    id: "result-3",
    period: "MAY01",
    resultDate: "2026-05-01",
    resultNumber: "612",
    status: "Settled",
    myReceiptStatus: "Matched",
    matchedReceiptNo: "FB-MAY01-000007",
    matchedNumber: "612",
    matchedAmount: 2000,
    settlementAmount: 1400000,
    walletCreditStatus: "Credited",
  },
];

const initialProfile: UserProfile = {
  name: "Flow Test User",
  phone: "+959777777777",
  email: "test@example.com",
  role: "User",
  status: "Active",
  phoneVerified: false,
  emailVerified: false,
};

function formatMmk(value: number) {
  const sign = value < 0 ? "-" : value > 0 ? "" : "";
  return `${sign}MMK ${Math.abs(value).toLocaleString("en-US")}`;
}

function nextTimestamp() {
  return "2026-06-30 16:10";
}

function buildReceiptNumber(sequence: number) {
  return `FB-TEST02-${String(sequence).padStart(6, "0")}`;
}

export function UserAppProvider({ children }: { children: ReactNode }) {
  const [availableBalance, setAvailableBalance] = useState(50000);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [pendingDeposit, setPendingDeposit] = useState(0);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);
  const [receipts, setReceipts] = useState<UserReceipt[]>(initialReceipts);
  const [walletTransactions, setWalletTransactions] =
    useState<UserWalletTransaction[]>(initialWalletTransactions);
  const [walletRequests, setWalletRequests] =
    useState<UserWalletRequest[]>(initialWalletRequests);
  const [activity, setActivity] = useState<UserWalletTransaction[]>(initialActivity);
  const [notifications, setNotifications] =
    useState<UserNotification[]>(initialNotifications);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [password, setPassword] = useState("testpassword123");

  const value = useMemo<UserAppContextValue>(
    () => ({
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
      pastResults: initialPastResults,
      profile,
      unreadCount: notifications.filter((item) => !item.read).length,
      submitDepositRequest: (input) => {
        setPendingDeposit((current) => current + input.amount);
        const time = nextTimestamp();
        setWalletRequests((current) => [
          {
            id: `wallet-request-${Date.now()}`,
            type: "Deposit",
            amount: input.amount,
            method: input.paymentMethod,
            referenceOrAccount: input.transactionReference || `DEP-REQ-${Date.now()}`,
            status: "Pending",
            createdAt: time,
            note: input.userNote,
          },
          ...current,
        ]);
        setWalletTransactions((current) => [
          {
            id: `wallet-${Date.now()}`,
            type: "Deposit Request",
            reference: input.transactionReference || `DEP-REQ-${Date.now()}`,
            amount: input.amount,
            balanceAfter: availableBalance,
            description: `${input.paymentMethod} deposit request`,
            date: time,
            status: "Pending",
          },
          ...current,
        ]);
        setNotifications((current) => [
          {
            id: `notification-${Date.now()}`,
            type: "Deposit",
            title: "Deposit Request Submitted",
            message: "Your deposit request has been submitted for review.",
            time,
            read: false,
          },
          ...current,
        ]);
      },
      submitWithdrawalRequest: (input) => {
        setPendingWithdrawal((current) => current + input.amount);
        setAvailableBalance((current) => current - input.amount);
        setLockedBalance((current) => current + input.amount);
        const time = nextTimestamp();
        setWalletRequests((current) => [
          {
            id: `wallet-request-${Date.now()}`,
            type: "Withdrawal",
            amount: input.amount,
            method: input.paymentMethod,
            referenceOrAccount: input.accountNumber,
            status: "Pending",
            createdAt: time,
            note: input.userNote,
          },
          ...current,
        ]);
        setWalletTransactions((current) => [
          {
            id: `wallet-${Date.now()}`,
            type: "Withdrawal Request",
            reference: `WD-REQ-${Date.now()}`,
            amount: -input.amount,
            balanceAfter: availableBalance - input.amount,
            description: `${input.paymentMethod} withdrawal request`,
            date: time,
            status: "Pending",
          },
          ...current,
        ]);
        setNotifications((current) => [
          {
            id: `notification-${Date.now()}`,
            type: "Wallet",
            title: "Withdrawal Request Submitted",
            message: "Your withdrawal request has been submitted for review.",
            time,
            read: false,
          },
          ...current,
        ]);
      },
      submitReceipt: (input) => {
        const totalAmount = input.items.reduce((sum, item) => {
          const multiplier = item.useR ? item.generatedNumbers.length : 1;
          return sum + item.amount * multiplier;
        }, 0);
        const nextBalance = availableBalance - totalAmount;
        const receiptNo = buildReceiptNumber(receipts.length + 1);
        const time = nextTimestamp();

        const receipt: UserReceipt = {
          id: `receipt-${Date.now()}`,
          receiptNo,
          period: input.period,
          totalAmount,
          status: "Paid",
          paymentStatus: "Paid",
          createdAt: time,
          walletTransaction: `Receipt ${receiptNo}`,
          items: input.items,
        };

        setReceipts((current) => [receipt, ...current]);
        setAvailableBalance(nextBalance);
        setWalletTransactions((current) => [
          {
            id: `wallet-${Date.now()}`,
            type: "Receipt Payment",
            reference: receiptNo,
            amount: -totalAmount,
            balanceAfter: nextBalance,
            description: `Receipt ${receiptNo}`,
            date: time,
            status: "Paid",
          },
          ...current,
        ]);
        setActivity((current) => [
          {
            id: `activity-${Date.now()}`,
            type: "Receipt Submitted",
            reference: receiptNo,
            amount: -totalAmount,
            balanceAfter: null,
            description: `Receipt ${receiptNo}`,
            date: time,
            status: "Paid",
          },
          ...current,
        ]);
        setNotifications((current) => [
          {
            id: `notification-${Date.now()}`,
            type: "Receipt",
            title: "Receipt Submitted",
            message: `Receipt ${receiptNo} was submitted successfully.`,
            time,
            read: false,
          },
          ...current,
        ]);

        return receipt;
      },
      markNotificationAsRead: (id) => {
        setNotifications((current) =>
          current.map((item) => (item.id === id ? { ...item, read: true } : item)),
        );
      },
      markAllNotificationsAsRead: () => {
        setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      },
      updateProfile: (input) => {
        setProfile((current) => ({ ...current, ...input }));
      },
      updatePassword: (input) => {
        if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
          return { ok: false, error: "All password fields are required." };
        }
        if (input.currentPassword !== password) {
          return { ok: false, error: "Current password is incorrect." };
        }
        if (input.newPassword !== input.confirmPassword) {
          return { ok: false, error: "New password and confirm password must match." };
        }
        setPassword(input.newPassword);
        return { ok: true };
      },
    }),
    [
      activity,
      availableBalance,
      lockedBalance,
      notifications,
      password,
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
