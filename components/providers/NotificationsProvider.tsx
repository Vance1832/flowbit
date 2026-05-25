"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from "@/lib/api/notifications";
import { ensureResults } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

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

type NotificationsContextValue = {
  loading: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function mapNotificationType(type: string): NotificationType {
  switch (type) {
    case "deposit":
      return "Deposit";
    case "withdrawal":
      return "Withdrawal";
    case "settlement":
      return "Settlement";
    case "result":
      return "Result";
    default:
      return "System";
  }
}

function mapNotification(item: ApiNotification): NotificationItem {
  return {
    id: String(item.id),
    title: item.title,
    message: item.message,
    type: mapNotificationType(item.notification_type),
    read: item.is_read,
    time: formatDateTime(item.created_at),
    critical: item.notification_type === "settlement",
  };
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const response = await getNotifications();
      setNotifications(ensureResults(response).map(mapNotification));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh().catch(() => {
        setNotifications([]);
        setLoading(false);
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const value = useMemo<NotificationsContextValue>(() => {
    const unreadCount = notifications.filter((item) => !item.read).length;

    return {
      loading,
      notifications,
      unreadCount,
      refresh,
      markAsRead: async (id: string) => {
        await markNotificationRead(Number(id));
        setNotifications((current) =>
          current.map((item) => (item.id === id ? { ...item, read: true } : item)),
        );
      },
      markAllAsRead: async () => {
        await markAllNotificationsRead();
        setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      },
    };
  }, [loading, notifications]);

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
