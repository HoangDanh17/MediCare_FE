"use client";

import { API_BASE_URL } from "./config";
import {
  BackendUnavailableError,
  SessionDeadError,
  getAccessToken,
} from "./client-auth";
import { ApiError, toApiError } from "./errors";

export const FORBIDDEN_EVENT = "mc:forbidden";
export const SESSION_EXPIRED_EVENT = "mc:session-expired";

export class SessionExpiredError extends ApiError {
  constructor() {
    super(401, "Phiên đăng nhập đã hết hạn.");
    this.name = "SessionExpiredError";
  }
}

export class BackendUnavailableApiError extends ApiError {
  constructor() {
    super(503, "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.");
    this.name = "BackendUnavailableApiError";
  }
}

export interface ApiClientOptions {
  /** Không refresh/redirect tự động khi nhận 401 (dùng cho trang login, đăng xuất). */
  skipAuthRedirect?: boolean;
}

function raiseSessionExpired(options: ApiClientOptions): never {
  if (!options.skipAuthRedirect) {
    // Phiên hết → SessionProvider (đang nghe sự kiện này) chuyển /login.
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
  throw new SessionExpiredError();
}

function raiseSessionFailure(error: unknown, options: ApiClientOptions): never {
  if (error instanceof SessionDeadError) raiseSessionExpired(options);
  if (error instanceof BackendUnavailableError) throw new BackendUnavailableApiError();
  throw error;
}

/**
 * Client gọi thẳng backend (API_BASE_URL) với Authorization Bearer.
 * - Tự refresh token khi hết hạn (single-flight), 401 giữa chừng → refresh + thử lại 1 lần.
 * - Refresh hỏng → xóa cookie + sự kiện chuyển /login.
 * - Lỗi mạng → lỗi "thử lại sau" (không đăng xuất).
 * - 403 → phát sự kiện refetch me/permissions rồi ném lỗi quyền.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options: ApiClientOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const send = (token: string | null): Promise<Response> =>
    fetch(url, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      credentials: "omit",
    });

  let token: string | null;
  try {
    token = await getAccessToken();
  } catch (error) {
    raiseSessionFailure(error, options);
  }

  let response: Response;
  try {
    response = await send(token);
  } catch {
    throw new BackendUnavailableApiError();
  }

  // Access bị backend từ chối giữa chừng → refreshforce rồi thử lại đúng 1 lần.
  if (response.status === 401 && token && !options.skipAuthRedirect) {
    try {
      const fresh = await getAccessToken(true);
      response = await send(fresh);
    } catch (error) {
      raiseSessionFailure(error, options);
    }
  }

  if (response.status === 401) {
    raiseSessionExpired(options);
  }

  if (response.status === 503) {
    throw new BackendUnavailableApiError();
  }

  if (response.status === 403) {
    window.dispatchEvent(new CustomEvent(FORBIDDEN_EVENT));
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
