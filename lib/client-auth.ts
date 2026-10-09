"use client";

import { API_BASE_URL } from "./config";
import { toApiError } from "./errors";
import type { LoginResponse } from "./types";

export const COOKIE_ACCESS = "mc_access";
export const COOKIE_REFRESH = "mc_refresh";
export const COOKIE_EXP = "mc_exp";

const ACCESS_MAX_AGE = 60 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

export class SessionDeadError extends Error {
  constructor(message = "Phiên đăng nhập đã hết hạn.") {
    super(message);
    this.name = "SessionDeadError";
  }
}

export class BackendUnavailableError extends Error {
  constructor(message = "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.") {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

// ---------- cookie (JS đọc/ghi được — đơn giản theo yêu cầu) ----------

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  const maxAge = Math.max(0, Math.floor(maxAgeSeconds));
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function readCookieJar(): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const part of document.cookie ? document.cookie.split("; ") : []) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    jar[part.slice(0, idx)] = decodeURIComponent(part.slice(idx + 1));
  }
  return jar;
}

export function getSession(): {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
} {
  const jar = readCookieJar();
  return {
    accessToken: jar[COOKIE_ACCESS],
    refreshToken: jar[COOKIE_REFRESH],
    expiresAt: jar[COOKIE_EXP],
  };
}

export function saveSession(pair: LoginResponse): void {
  const expMs = Date.parse(pair.expiresAt);
  const expSeconds = Number.isNaN(expMs)
    ? ACCESS_MAX_AGE
    : Math.max(0, (expMs - Date.now()) / 1000);

  setCookie(COOKIE_ACCESS, pair.accessToken, Math.min(ACCESS_MAX_AGE, expSeconds));
  setCookie(COOKIE_REFRESH, pair.refreshToken, REFRESH_MAX_AGE);
  setCookie(COOKIE_EXP, pair.expiresAt, Math.min(ACCESS_MAX_AGE, expSeconds));
}

export function clearSession(): void {
  setCookie(COOKIE_ACCESS, "", 0);
  setCookie(COOKIE_REFRESH, "", 0);
  setCookie(COOKIE_EXP, "", 0);
}

// ---------- đăng nhập / đăng xuất ----------

export async function login(email: string, password: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    throw new BackendUnavailableError();
  }
  if (!res.ok) throw await toApiError(res);
  saveSession((await res.json()) as LoginResponse);
}

async function postWithAuth(path: string, body?: object): Promise<Response> {
  let token: string | null;
  try {
    token = await getAccessToken();
  } catch (error) {
    if (error instanceof SessionDeadError) return new Response(null, { status: 401 });
    throw error;
  }
  return fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
}

/**
 * Đăng xuất: gọi backend thu hồi refresh token (best effort),
 * luôn xóa cookie local. Lỗi mạng/5xx → ném BackendUnavailableError (giữ cookie).
 */
export async function logout(): Promise<void> {
  const { refreshToken } = getSession();
  if (!refreshToken) {
    clearSession();
    return;
  }
  let res: Response;
  try {
    res = await postWithAuth("/api/auth/logout", { refreshToken });
  } catch {
    throw new BackendUnavailableError();
  }
  if (res.status === 401 || res.ok || (res.status >= 400 && res.status < 500)) {
    clearSession();
    return;
  }
  throw new BackendUnavailableError();
}

// ---------- refresh token (single-flight + cache chống straggler) ----------

const RECENT_TTL_MS = 30_000;
let inflight: { key: string; promise: Promise<LoginResponse> } | null = null;
const recent = new Map<string, { pair: LoginResponse; at: number }>();

function pruneRecent(): void {
  const now = Date.now();
  for (const [key, entry] of recent) {
    if (now - entry.at > RECENT_TTL_MS) recent.delete(key);
  }
}

async function requestRefresh(refreshToken: string): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
  } catch {
    throw new BackendUnavailableError();
  }
  if (res.ok) return (await res.json()) as LoginResponse;
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    clearSession();
    throw new SessionDeadError();
  }
  throw new BackendUnavailableError();
}

async function refreshWith(refreshToken: string): Promise<string> {
  pruneRecent();
  const hit = recent.get(refreshToken);
  if (hit) {
    saveSession(hit.pair);
    return hit.pair.accessToken;
  }

  let pending =
    inflight?.key === refreshToken ? inflight.promise : null;
  if (!pending) {
    pending = requestRefresh(refreshToken);
    inflight = { key: refreshToken, promise: pending };
    void pending
      .catch(() => undefined)
      .finally(() => {
        if (inflight?.key === refreshToken) inflight = null;
      });
  }

  const pair = await pending;
  recent.set(refreshToken, { pair, at: Date.now() });
  saveSession(pair);
  return pair.accessToken;
}

/**
 * Trả access token hợp lệ (tự refresh khi sắp hết hạn).
 * - Chưa đăng nhập → null.
 * - Refresh token chết → xóa cookie + SessionDeadError.
 * - Lỗi mạng/5xx → BackendUnavailableError (giữ cookie).
 * force = true: backend vừa từ chối access → refresh ngay dù cookie còn hạn.
 */
export async function getAccessToken(force = false): Promise<string | null> {
  const { accessToken, refreshToken, expiresAt } = getSession();
  if (!accessToken && !refreshToken) return null;

  const expMs = expiresAt ? Date.parse(expiresAt) : NaN;
  if (!force && accessToken && !Number.isNaN(expMs) && expMs - Date.now() > 60_000) {
    return accessToken;
  }
  if (!refreshToken) {
    clearSession();
    throw new SessionDeadError();
  }
  return refreshWith(refreshToken);
}
