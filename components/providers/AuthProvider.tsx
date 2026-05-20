"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const AUTH_STORAGE_KEY = "flowbit_mock_auth";
const OWNER_PHONE = "+95912345678";
const STAFF_PHONE = "+95912345000";
const USER_PHONE = "+959777777777";
const DEMO_PASSWORD = "testpassword123";

export type MockAuthRole = "Owner" | "Staff" | "User";

export type MockAuthUser = {
  name: string;
  role: MockAuthRole;
  profileLabel: string;
  phone: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: MockAuthUser | null;
  login: (phone: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  register: () => void;
  getDefaultRoute: (role?: MockAuthRole | null) => string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function defaultUser(role: MockAuthRole): MockAuthUser {
  switch (role) {
    case "Staff":
      return {
        name: "Staff One",
        role: "Staff",
        profileLabel: "Staff Console",
        phone: STAFF_PHONE,
      };
    case "User":
      return {
        name: "Flow Test User",
        role: "User",
        profileLabel: "Flow Test User",
        phone: USER_PHONE,
      };
    case "Owner":
    default:
      return {
        name: "Owner Console",
        role: "Owner",
        profileLabel: "Owner Console",
        phone: OWNER_PHONE,
      };
  }
}

export function getDefaultRouteForRole(role?: MockAuthRole | null) {
  switch (role) {
    case "Staff":
      return "/staff/dashboard";
    case "User":
      return "/user/dashboard";
    case "Owner":
    default:
      return "/";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockAuthUser | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as MockAuthUser;
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: user !== null,
      user,
      login: (phone: string, password: string) => {
        const normalizedPhone = phone.trim();
        const normalizedPassword = password.trim();

        if (!normalizedPhone || !normalizedPassword) {
          return { ok: false, error: "Phone and password are required." };
        }

        if (normalizedPassword !== DEMO_PASSWORD) {
          return {
            ok: false,
            error: "Invalid demo credentials. Use one of the provided demo accounts.",
          };
        }

        let role: MockAuthRole | null = null;

        if (normalizedPhone === OWNER_PHONE) {
          role = "Owner";
        } else if (normalizedPhone === STAFF_PHONE) {
          role = "Staff";
        } else if (normalizedPhone === USER_PHONE) {
          role = "User";
        }

        if (!role) {
          return {
            ok: false,
            error: "Invalid demo credentials. Use one of the provided demo accounts.",
          };
        }

        const nextUser = defaultUser(role);
        setUser(nextUser);
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
        return { ok: true };
      },
      logout: () => {
        setUser(null);
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      },
      register: () => {
        window.localStorage.setItem(
          "flowbit_mock_registered",
          JSON.stringify({ at: "2026-06-30 16:30" }),
        );
      },
      getDefaultRoute: (role) => getDefaultRouteForRole(role ?? user?.role),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export const mockDemoCredentials = {
  phone: OWNER_PHONE,
  password: DEMO_PASSWORD,
};

export const mockDemoAccounts = [
  { label: "Owner", phone: OWNER_PHONE, password: DEMO_PASSWORD },
  { label: "Staff", phone: STAFF_PHONE, password: DEMO_PASSWORD },
  { label: "User", phone: USER_PHONE, password: DEMO_PASSWORD },
] as const;
