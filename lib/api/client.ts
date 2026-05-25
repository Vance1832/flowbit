export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export const ACCESS_TOKEN_STORAGE_KEY = "flowbit_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "flowbit_refresh_token";
export const SESSION_EXPIRED_MESSAGE = "Your session expired. Please log in again.";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeBaseUrl(API_BASE_URL)}${normalizedPath}`;
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function storeAuthTokens(tokens: { access: string; refresh: string }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, tokens.access);
  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh);
}

export function updateStoredAccessToken(access: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, access);
}

export function clearStoredAuthTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

function redirectToLogin() {
  if (typeof window === "undefined") return;

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTokenErrorPayload(payload: unknown) {
  if (!isRecord(payload)) {
    return false;
  }

  if (payload.code === "token_not_valid") {
    return true;
  }

  if (typeof payload.detail === "string") {
    const normalizedDetail = payload.detail.toLowerCase();

    if (
      normalizedDetail.includes("token not valid")
      || normalizedDetail.includes("token is invalid")
      || normalizedDetail.includes("token has expired")
      || normalizedDetail.includes("authorization token is invalid")
    ) {
      return true;
    }
  }

  if (Array.isArray(payload.messages)) {
    return payload.messages.some(
      (entry) =>
        isRecord(entry)
        && typeof entry.message === "string"
        && entry.message.toLowerCase().includes("token"),
    );
  }

  return false;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  const messages = Object.entries(payload as Record<string, unknown>)
    .flatMap(([field, value]) => {
      if (Array.isArray(value)) {
        return value.map((entry) =>
          typeof entry === "string" ? `${field}: ${entry}` : null,
        );
      }

      if (typeof value === "string") {
        return [`${field}: ${value}`];
      }

      return [];
    })
    .filter((value): value is string => Boolean(value));

  return messages[0] ?? fallback;
}

type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: BodyInit | object | null;
  headers?: HeadersInit;
  skipAuthRedirect?: boolean;
  skipAuthRefresh?: boolean;
  token?: string | null;
};

type ParsedApiResponse = {
  contentType: string;
  payload: unknown;
  response: Response;
};

let refreshRequestPromise: Promise<string | null> | null = null;

async function performApiRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ParsedApiResponse> {
  const { body, headers, token, skipAuthRedirect, skipAuthRefresh, ...init } = options;
  const resolvedToken = token ?? getStoredAccessToken();
  const requestHeaders = new Headers(headers);

  void skipAuthRedirect;
  void skipAuthRefresh;

  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  requestHeaders.set("Accept", "application/json");

  if (resolvedToken) {
    requestHeaders.set("Authorization", `Bearer ${resolvedToken}`);
  }

  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: requestHeaders,
    body:
      body && !(body instanceof FormData) && typeof body !== "string"
        ? JSON.stringify(body)
        : (body ?? undefined),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  return { response, payload, contentType };
}

function buildApiError(
  response: Response,
  payload: unknown,
  options?: { sessionExpired?: boolean },
) {
  return new ApiError(
    options?.sessionExpired || isTokenErrorPayload(payload)
      ? SESSION_EXPIRED_MESSAGE
      : extractErrorMessage(payload, `Request failed with status ${response.status}.`),
    response.status,
    payload,
  );
}

async function refreshAccessToken() {
  if (refreshRequestPromise) {
    return refreshRequestPromise;
  }

  const refresh = getStoredRefreshToken();

  if (!refresh) {
    return null;
  }

  refreshRequestPromise = (async () => {
    try {
      const { response, payload } = await performApiRequest("/api/auth/refresh/", {
        method: "POST",
        body: { refresh },
        skipAuthRefresh: true,
      });

      if (!response.ok || !isRecord(payload) || typeof payload.access !== "string") {
        throw buildApiError(response, payload, { sessionExpired: true });
      }

      updateStoredAccessToken(payload.access);
      return payload.access;
    } catch {
      clearStoredAuthTokens();
      return null;
    } finally {
      refreshRequestPromise = null;
    }
  })();

  return refreshRequestPromise;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const { skipAuthRedirect = false, skipAuthRefresh = false } = options;
  const initialResult = await performApiRequest(path, options);

  if (
    initialResult.response.status === 401
    && !skipAuthRefresh
    && path !== "/api/auth/login/"
    && path !== "/api/auth/refresh/"
    && getStoredRefreshToken()
  ) {
    const refreshedAccessToken = await refreshAccessToken();

    if (refreshedAccessToken) {
      const retryResult = await performApiRequest(path, {
        ...options,
        skipAuthRefresh: true,
        token: refreshedAccessToken,
      });

      if (retryResult.response.ok) {
        return retryResult.payload as T;
      }

      if (retryResult.response.status === 401) {
        clearStoredAuthTokens();

        if (!skipAuthRedirect) {
          redirectToLogin();
        }

        throw buildApiError(retryResult.response, retryResult.payload, {
          sessionExpired: true,
        });
      }

      throw buildApiError(retryResult.response, retryResult.payload);
    }

    if (!skipAuthRedirect) {
      redirectToLogin();
    }

    throw buildApiError(initialResult.response, initialResult.payload, {
      sessionExpired: true,
    });
  }

  if (!initialResult.response.ok) {
    const shouldTreatAsExpiredSession =
      initialResult.response.status === 401
      && path !== "/api/auth/login/"
      && path !== "/api/auth/refresh/"
      && (
        isTokenErrorPayload(initialResult.payload)
        || Boolean(getStoredAccessToken())
        || Boolean(getStoredRefreshToken())
      );

    if (shouldTreatAsExpiredSession) {
      clearStoredAuthTokens();

      if (!skipAuthRedirect) {
        redirectToLogin();
      }
    }

    throw buildApiError(initialResult.response, initialResult.payload, {
      sessionExpired: shouldTreatAsExpiredSession,
    });
  }

  return initialResult.payload as T;
}
