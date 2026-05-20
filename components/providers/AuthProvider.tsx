"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const AUTH_STORAGE_KEY = "flowbit_mock_auth";
const DEMO_PHONE = "+95912345678";
const DEMO_PASSWORD = "testpassword123";

export type MockAuthUser = {
  name: string;
  role: "Owner";
  profileLabel: string;
  phone: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: MockAuthUser | null;
  login: (phone: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  register: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function defaultUser(): MockAuthUser {
  return {
    name: "Owner Console",
    role: "Owner",
    profileLabel: "Owner Console",
    phone: DEMO_PHONE,
  };
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

        if (
          normalizedPhone !== DEMO_PHONE ||
          normalizedPassword !== DEMO_PASSWORD
        ) {
          return {
            ok: false,
            error: "Invalid demo credentials. Use the provided phone and password.",
          };
        }

        const nextUser = defaultUser();
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
  phone: DEMO_PHONE,
  password: DEMO_PASSWORD,
};
