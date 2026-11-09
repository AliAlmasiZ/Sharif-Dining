import { API_BASE_URL, API_ORIGIN, BASIC_AUTH, STORAGE_KEYS } from "./constants";
import { ApiError } from "./client";
import type { LoginResponse, AuthState, CaptchaData, CaptchaParams, CaptchaApiResponse } from "@/types";

type AuthListener = () => void;
const listeners = new Set<AuthListener>();

export function subscribeAuth(callback: AuthListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

const EMPTY_AUTH: AuthState = { token: "", username: "" };
let cachedAuth: AuthState = EMPTY_AUTH;

/**
 * Retrieve saved authentication info from localStorage with snapshot caching
 * for safe use with useSyncExternalStore.
 */
export function getStoredAuth(): AuthState {
  if (typeof window === "undefined") {
    return EMPTY_AUTH;
  }
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN) || "";
  const username = localStorage.getItem(STORAGE_KEYS.USER) || "";

  if (!token && !username) {
    cachedAuth = EMPTY_AUTH;
    return EMPTY_AUTH;
  }

  if (cachedAuth.token !== token || cachedAuth.username !== username) {
    cachedAuth = { token, username };
  }
  return cachedAuth;
}

export function getServerAuthSnapshot(): AuthState {
  return EMPTY_AUTH;
}

/**
 * Save authentication info to localStorage.
 */
export function saveStoredAuth(auth: AuthState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.TOKEN, auth.token);
  localStorage.setItem(STORAGE_KEYS.USER, auth.username);
  cachedAuth = { token: auth.token, username: auth.username };
  notifyListeners();
}

/**
 * Clear authentication info from localStorage.
 */
export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  cachedAuth = EMPTY_AUTH;
  notifyListeners();
}

/**
 * Generate a standard RFC 4122 v4 UUID string.
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Fetch a new captcha challenge from Sharif dining server.
 */
export async function fetchCaptcha(): Promise<CaptchaData> {
  const nonce = generateUUID();

  const res = await fetch(`${API_BASE_URL}/captcha?_t=${Date.now()}`, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    credentials: "omit",
    headers: {
      accept: "application/json",
      "cache-control": "no-cache, no-store, must-revalidate",
      pragma: "no-cache",
      expires: "0",
      "content-type": "application/json",
    },
    body: JSON.stringify({ nonce }),
  });

  const json: CaptchaApiResponse = await res.json().catch(() => ({}));

  if (!res.ok || json.type === "ERROR" || !json.payload?.image || !json.payload?.validation) {
    const errorMsg =
      json.messageFa ||
      json.message ||
      `خطا در دریافت کد امنیتی (${res.status})`;
    throw new ApiError(res.status, errorMsg, json.messageFa, json);
  }

  return {
    image: json.payload.image,
    validation: json.payload.validation,
    nonce,
  };
}

/**
 * Perform OAuth login with Sharif dining credentials.
 */
export async function loginUser(
  username: string,
  pass: string,
  captcha?: CaptchaParams
): Promise<AuthState> {
  const trimmedUser = username.trim();
  if (!trimmedUser || !pass) {
    throw new Error("نام کاربری و رمز عبور را وارد کنید.");
  }

  const nonce = captcha?.nonce || generateUUID();

  const body = new URLSearchParams({
    username: trimmedUser,
    password: pass,
    captchaText: captcha?.captchaText ?? "",
    validation: captcha?.validation ?? "undefined",
    nonce,
    grant_type: "password",
    scope: "read write",
  });

  const res = await fetch(`${API_ORIGIN}/oauth/token?_t=${Date.now()}`, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    credentials: "omit",
    headers: {
      accept: "application/json",
      authorization: BASIC_AUTH,
      "cache-control": "no-cache, no-store, must-revalidate",
      pragma: "no-cache",
      expires: "0",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  });

  const json: LoginResponse = await res.json().catch(() => ({}));

  if (!res.ok || json.type === "ERROR" || !json.access_token) {
    const errorMsg =
      json.messageFa ||
      json.error_description ||
      json.message ||
      json.error ||
      `HTTP ${res.status}`;
    throw new ApiError(res.status, errorMsg, json.messageFa, json);
  }

  const authState: AuthState = {
    token: json.access_token,
    username: trimmedUser,
  };

  saveStoredAuth(authState);
  return authState;
}

/**
 * Logout user on the remote server and clear local session.
 */
export async function logoutUser(username: string, token: string): Promise<void> {
  try {
    if (username && token) {
      await fetch(`${API_ORIGIN}/rest/oauth/${encodeURIComponent(username)}/logout?_t=${Date.now()}`, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        headers: {
          accept: "*/*",
          authorization: `Bearer ${token}`,
          "cache-control": "no-cache, no-store, must-revalidate",
          pragma: "no-cache",
          expires: "0",
        },
      });
    }
  } catch {
    // Ignore server error on logout
  } finally {
    clearStoredAuth();
  }
}
