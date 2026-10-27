"use client";

import { ApiError, toApiError } from "./errors";

export const FORBIDDEN_EVENT = "mc:forbidden";
export const SESSION_EXPIRED_EVENT = "mc:session-expired";

class SessionExpiredError extends ApiError {
  constructor() {
    super(401, "Phiên đăng nhập đã hết hạn.");
    this.name = "SessionExpiredError";
  }
}

class BackendUnavailableApiError extends ApiError {
  constructor() {
    super(503, "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.");
    this.name = "BackendUnavailableApiError";
  }
}

/**
 * Gọi API qua BFF của Next (cùng origin). Token nằm trong cookie httpOnly do
 * server giữ; trình duyệt không bao giờ thấy access/refresh token.
 * - 401 → phiên chết: phát sự kiện để SessionProvider chuyển /login.
 * - 503 → backend không với tới được: lỗi "thử lại sau" (không đăng xuất).
 * - 403 → phát sự kiện refetch me/permissions rồi ném lỗi quyền.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new BackendUnavailableApiError();
  }

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    throw new SessionExpiredError();
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
