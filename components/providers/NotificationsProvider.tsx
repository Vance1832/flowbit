"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type NotificationType =
  | "Deposit"
  | "Withdrawal"
  | "Settlement"
  | "Result"
  | "System";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  critical?: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: "nt-1",
    title: "Deposit Approved",
    message: "Deposit request DEP-FLOW-001 for MMK 50,000 has been approved.",
    type: "Deposit",
    read: false,
    time: "2026-06-30 10:40",
  },
  {
    id: "nt-2",
    title: "Withdrawal Waiting Payment",
    message: "Withdrawal request WD-0005 is approved and waiting to be marked as paid.",
    type: "Withdrawal",
    read: false,
    time: "2026-06-30 11:00",
  },
  {
    id: "nt-3",
    title: "Result Entered",
    message: "Result number 124 was entered for TEST02.",
    type: "Result",
    read: true,
    time: "2026-06-30 15:00",
  },
  {
    id: "nt-4",
    title: "Settlement Funding Required",
    message: "Settlement SET-TEST02-001 requires MMK 2,094,000 from company reserve.",
    type: "Settlement",
    read: false,
    critical: true,
    time: "2026-06-30 15:05",
  },
  {
    id: "nt-5",
    title: "Company Reserve Updated",
    message: "Company reserve deposit of MMK 3,000,000 was added by Owner.",
    type: "System",
    read: true,
    time: "2026-06-30 09:00",
  },
];

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const value = useMemo(() => {
    const unreadCount = notifications.filter((item) => !item.read).length;

    return {
      notifications,
      unreadCount,
      markAsRead: (id: string) => {
        setNotifications((current) =>
          current.map((item) => (item.id === id ? { ...item, read: true } : item)),
        );
      },
      markAllAsRead: () => {
        setNotifications((current) =>
          current.map((item) => ({
            ...item,
            read: true,
          })),
        );
      },
    };
  }, [notifications]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}
