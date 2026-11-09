import { API_BASE_URL } from "./constants";
import type { ApiResponse } from "@/types";
import { toast } from "@/components/Toast";

export class ApiError extends Error {
  status: number;
  messageFa?: string;
  payload?: unknown;

  constructor(status: number, message: string, messageFa?: string, payload?: unknown) {
    super(messageFa || message);
    this.name = "ApiError";
    this.status = status;
    this.messageFa = messageFa;
    this.payload = payload;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export interface ApiFetchOptions extends RequestInit {
  token?: string;
  showToast?: boolean;
}

/**
 * Common fetch client for the Sharif dining REST API.
 * Disables caching by default with no-store, cache-control headers, and timestamp query param.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { token, headers: customHeaders, showToast = false, ...fetchOpts } = options;

  const headers: Record<string, string> = {
    accept: "application/json",
    "cache-control": "no-cache, no-store, must-revalidate",
    pragma: "no-cache",
    expires: "0",
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }

  if (fetchOpts.body && typeof fetchOpts.body === "string" && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }

  const baseUrl = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const separator = baseUrl.includes("?") ? "&" : "?";
  const url = `${baseUrl}${separator}_t=${Date.now()}`;

  const res = await fetch(url, {
    cache: "no-store",
    ...fetchOpts,
    headers,
    mode: "cors",
    credentials: "omit", // Bearer auth; "include" breaks with wildcard CORS
  });

  const json: ApiResponse<T> = await res.json().catch(() => ({}));

  if (res.status === 401) {
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }
    const err = new ApiError(401, "Unauthorized", "نشست منقضی شده؛ دوباره وارد شوید.", json);
    if (showToast) {
      toast.error(err.messageFa || err.message);
    }
    throw err;
  }

  const isErrorResponse =
    !res.ok ||
    json.type === "ERROR" ||
    json.type === "error" ||
    (typeof json.code === "number" && json.code !== 0 && json.code !== 200) ||
    Boolean(json.error);

  if (isErrorResponse) {
    const errorMsg = json.messageFa || json.message || json.error || `HTTP ${res.status}`;
    const statusCode = typeof json.code === "number" ? json.code : res.status;
    const err = new ApiError(statusCode, errorMsg, json.messageFa, json);
    if (showToast) {
      toast.error(errorMsg);
    }
    throw err;
  }

  return json as T;
}
