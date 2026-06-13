"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUserRequest,
  loginRequest,
  type BackendUserRole,
  type CurrentUser,
} from "@/lib/api/auth";
import {
  registerAccount,
  type ApiRegisterInput,
} from "@/lib/api/accounts";
import {
  ApiError,
  SESSION_EXPIRED_MESSAGE,
  clearStoredAuthTokens,
  getStoredRefreshToken,
  storeAuthTokens,
} from "@/lib/api/client";

export type AuthUserRole = BackendUserRole;

export type AuthUser = CurrentUser;

type AuthContextValue = {
  authLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (
    phone: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string; role?: AuthUserRole }>;
  logout: () => void;
  register: (
    input: ApiRegisterInput,
  ) => Promise<{ ok: boolean; error?: string }>;
  getDefaultRoute: (role?: AuthUserRole | null) => string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function getDefaultRouteForRole(role?: AuthUserRole | null) {
  switch (role) {
    case "staff":
      return "/staff/dashboard";
    case "user":
    case "vip_user":
      return "/user/dashboard";
    case "admin":
    case "owner":
      return "/console";
    default:
      return "/console";
  }
}

function normalizeAuthError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return SESSION_EXPIRED_MESSAGE;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to complete authentication request.";
}

export function isOwnerOrAdmin(role?: AuthUserRole | null) {
  return role === "owner" || role === "admin";
}

export function isStaff(role?: AuthUserRole | null) {
  return role === "staff";
}

export function isUserRole(role?: AuthUserRole | null) {
  return role === "user" || role === "vip_user";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredAuthTokens();
    setUser(null);
    setAuthLoading(false);

    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const currentUser = await getCurrentUserRequest();
    setUser(currentUser);
    return currentUser;
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrateAuth() {
      const refresh = getStoredRefreshToken();

      if (!refresh) {
        if (active) {
          setUser(null);
          setAuthLoading(false);
        }
        return;
      }

      try {
        await loadCurrentUser();
      } catch {
        clearStoredAuthTokens();
        if (active) {
          setUser(null);
        }

        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    hydrateAuth();

    return () => {
      active = false;
    };
  }, [loadCurrentUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authLoading,
      isAuthenticated: user !== null,
      user,
      login: async (phone: string, password: string) => {
        const normalizedPhone = phone.trim();
        const normalizedPassword = password.trim();

        if (!normalizedPhone || !normalizedPassword) {
          return { ok: false, error: "Phone and password are required." };
        }

        setAuthLoading(true);

        try {
          const response = await loginRequest(normalizedPhone, normalizedPassword);
          storeAuthTokens({
            access: response.access,
            refresh: response.refresh,
          });

          try {
            const currentUser = await getCurrentUserRequest(response.access);
            setUser(currentUser);
            return { ok: true, role: currentUser.role };
          } catch {
            const fallbackUser = {
              ...response.user,
              phone_country_code: normalizedPhone.startsWith("+95") ? "+95" : "",
              phone_number: normalizedPhone,
              email: null,
              phone_verified: false,
              email_verified: false,
            };
            setUser(fallbackUser);
            return { ok: true, role: fallbackUser.role };
          }
        } catch (error) {
          clearStoredAuthTokens();
          setUser(null);
          return { ok: false, error: normalizeAuthError(error) };
        } finally {
          setAuthLoading(false);
        }
      },
      logout,
      register: async (input) => {
        try {
          await registerAccount(input);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: normalizeAuthError(error) };
        }
      },
      getDefaultRoute: (role) => getDefaultRouteForRole(role ?? user?.role),
    }),
    [authLoading, logout, user],
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
