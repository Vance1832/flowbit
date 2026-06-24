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
  isTwoFactorChallenge,
  loginRequest,
  logoutRequest,
  verifyLogin2fa,
  type BackendUserRole,
  type CurrentUser,
  type LoginResponse,
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
  ) => Promise<{
    ok: boolean;
    error?: string;
    role?: AuthUserRole;
    twoFactorRequired?: boolean;
    phone?: string;
    debugCode?: string;
  }>;
  verify2fa: (
    phone: string,
    code: string,
  ) => Promise<{ ok: boolean; error?: string; role?: AuthUserRole }>;
  logout: () => void;
  register: (
    input: ApiRegisterInput,
  ) => Promise<{ ok: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  getDefaultRoute: (role?: AuthUserRole | null) => string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function getDefaultRouteForRole(role?: AuthUserRole | null) {
  switch (role) {
    case "staff":
      return "/staff/dashboard";
    case "user":
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
  return role === "user";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const logout = useCallback(async () => {
    // Best-effort server-side revoke (blacklist the refresh token) while the
    // access token is still stored, then clear locally.
    const refresh = getStoredRefreshToken();
    if (refresh) {
      try {
        await logoutRequest(refresh);
      } catch {
        // ignore — clearing locally still ends the session on this device
      }
    }

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

  // Shared tail of a successful auth (password-only or after a 2FA code):
  // persist tokens, then load the full profile (with a degraded fallback).
  const finishLogin = useCallback(
    async (response: LoginResponse, phone: string) => {
      storeAuthTokens({ access: response.access, refresh: response.refresh });

      try {
        const currentUser = await getCurrentUserRequest(response.access);
        setUser(currentUser);
        return { ok: true as const, role: currentUser.role };
      } catch {
        const fallbackUser: AuthUser = {
          ...response.user,
          phone_country_code: phone.startsWith("+95") ? "+95" : "",
          phone_number: phone,
          email: null,
          phone_verified: false,
          email_verified: false,
          two_factor_enabled: false,
        };
        setUser(fallbackUser);
        return { ok: true as const, role: fallbackUser.role };
      }
    },
    [],
  );

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
          const result = await loginRequest(normalizedPhone, normalizedPassword);

          // 2FA-enabled accounts get an OTP challenge instead of tokens.
          if (isTwoFactorChallenge(result)) {
            return {
              ok: false,
              twoFactorRequired: true,
              phone: result.phone,
              debugCode: result.debug_code,
            };
          }

          return finishLogin(result, normalizedPhone);
        } catch (error) {
          clearStoredAuthTokens();
          setUser(null);
          return { ok: false, error: normalizeAuthError(error) };
        } finally {
          setAuthLoading(false);
        }
      },
      verify2fa: async (phone: string, code: string) => {
        const normalizedCode = code.trim();
        if (!normalizedCode) {
          return { ok: false, error: "Verification code is required." };
        }

        setAuthLoading(true);
        try {
          const response = await verifyLogin2fa(phone, normalizedCode);
          return finishLogin(response, phone);
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
      refreshUser: async () => {
        try {
          await loadCurrentUser();
        } catch {
          // keep the existing user if the refresh fails
        }
      },
      getDefaultRoute: (role) => getDefaultRouteForRole(role ?? user?.role),
    }),
    [authLoading, finishLogin, loadCurrentUser, logout, user],
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
