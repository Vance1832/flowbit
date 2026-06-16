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
import { changePassword } from "@/lib/api/accounts";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { ensureResults } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export type StaffNotificationType =
  | "Deposit"
  | "Withdrawal"
  | "Result"
  | "System";

type StaffNotification = {
  id: string;
  type: StaffNotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

type StaffProfile = {
  name: string;
  phone: string;
  email: string;
  role: "Staff";
  status: "Active";
};

type StaffAppContextValue = {
  loading: boolean;
  notifications: StaffNotification[];
  unreadCount: number;
  profile: StaffProfile;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  updateProfile: (next: Pick<StaffProfile, "name" | "email">) => void;
  updatePassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
};

const StaffAppContext = createContext<StaffAppContextValue | null>(null);

function mapNotificationType(type: string): StaffNotificationType {
  switch (type) {
    case "deposit":
      return "Deposit";
    case "withdrawal":
      return "Withdrawal";
    case "result":
      return "Result";
    default:
      return "System";
  }
}

export function StaffAppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileDraft, setProfileDraft] = useState<{ name: string; email: string | null } | null>(
    null,
  );

  async function refreshNotifications() {
    setLoading(true);
    try {
      const response = await getNotifications();
      setNotifications(
        ensureResults(response).map((item) => ({
          id: String(item.id),
          type: mapNotificationType(item.notification_type),
          title: item.title,
          message: item.message,
          time: formatDateTime(item.created_at),
          read: item.is_read,
        })),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshNotifications().catch(() => {
        setNotifications([]);
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const profile = useMemo<StaffProfile>(() => {
    return {
      name: profileDraft?.name ?? user?.name ?? "",
      phone: user?.phone ?? "",
      email: profileDraft?.email ?? user?.email ?? "",
      role: "Staff",
      status: "Active",
    };
  }, [profileDraft?.email, profileDraft?.name, user]);

  const value = useMemo<StaffAppContextValue>(() => {
    const unreadCount = notifications.filter((item) => !item.read).length;

    return {
      loading,
      notifications,
      unreadCount,
      profile,
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
      updateProfile: (next) => {
        setProfileDraft((current) => ({
          name: next.name,
          email: next.email,
          ...current,
        }));
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
    };
  }, [loading, notifications, profile]);

  return (
    <StaffAppContext.Provider value={value}>{children}</StaffAppContext.Provider>
  );
}

export function useStaffApp() {
  const context = useContext(StaffAppContext);
  if (!context) {
    throw new Error("useStaffApp must be used within StaffAppProvider");
  }
  return context;
}
