"use client";

import { toApiError } from "./errors";

class BackendUnavailableError extends Error {
  constructor(message = "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.") {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

/** Đăng nhập qua BFF: server nhận token từ backend và ghi cookie httpOnly. */
export async function login(email: string, password: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new BackendUnavailableError();
  }

  if (!response.ok) throw await toApiError(response);
}

/** Đăng xuất qua BFF: server thu hồi refresh token và xóa cookie phiên. */
export async function logout(): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new BackendUnavailableError();
  }

  if (!response.ok) throw await toApiError(response);
}
