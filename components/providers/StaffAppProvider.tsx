"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type StaffNotificationType =
  | "Deposit"
  | "Withdrawal"
  | "Queue"
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
  notifications: StaffNotification[];
  unreadCount: number;
  profile: StaffProfile;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  updateProfile: (next: Pick<StaffProfile, "name" | "email">) => void;
  updatePassword: () => void;
};

const StaffAppContext = createContext<StaffAppContextValue | null>(null);

const initialNotifications: StaffNotification[] = [
  {
    id: "staff-notif-1",
    type: "Deposit",
    title: "Deposit Assigned",
    message: "Deposit request DEP-FLOW-001 was assigned to your queue.",
    time: "2026-06-30 10:35",
    read: false,
  },
  {
    id: "staff-notif-2",
    type: "Withdrawal",
    title: "Withdrawal Waiting Payment",
    message: "Withdrawal request WD-0005 is approved and waiting to be marked as paid.",
    time: "2026-06-30 11:00",
    read: false,
  },
  {
    id: "staff-notif-3",
    type: "Deposit",
    title: "Deposit Approved",
    message: "Deposit request KP-223912 was approved successfully.",
    time: "2026-06-30 10:25",
    read: true,
  },
  {
    id: "staff-notif-4",
    type: "Withdrawal",
    title: "Withdrawal Paid",
    message: "Withdrawal request WD-0004 was marked as paid.",
    time: "2026-06-30 09:45",
    read: true,
  },
];

const initialProfile: StaffProfile = {
  name: "Staff One",
  phone: "+959222222222",
  email: "staff@flowbit.local",
  role: "Staff",
  status: "Active",
};

export function StaffAppProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] =
    useState<StaffNotification[]>(initialNotifications);
  const [profile, setProfile] = useState<StaffProfile>(initialProfile);

  const value = useMemo<StaffAppContextValue>(() => {
    const unreadCount = notifications.filter((item) => !item.read).length;

    return {
      notifications,
      unreadCount,
      profile,
      markNotificationAsRead: (id) => {
        setNotifications((current) =>
          current.map((item) => (item.id === id ? { ...item, read: true } : item)),
        );
      },
      markAllNotificationsAsRead: () => {
        setNotifications((current) =>
          current.map((item) => ({ ...item, read: true })),
        );
      },
      updateProfile: (next) => {
        setProfile((current) => ({ ...current, ...next }));
      },
      updatePassword: () => {},
    };
  }, [notifications, profile]);

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
