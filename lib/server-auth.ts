import { cookies } from "next/headers";

import { API_BASE_URL } from "./config";
import type { LoginResponse } from "./types";

const COOKIE_ACCESS = "mc_access";
const COOKIE_REFRESH = "mc_refresh";
const COOKIE_EXP = "mc_exp";

export const UNAVAILABLE_DETAIL = "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";

const ACCESS_MAX_AGE = 60 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;
/** Refresh sớm 60s để không gửi access token sắp hết hạn. */
const REFRESH_SKEW_MS = 60_000;
/** Giữ kết quả refresh 30s cho các request còn cầm refresh token cũ. */
const RECENT_TTL_MS = 30_000;

// Trạng thái single-flight/cache dùng chung trong tiến trình Next.
let inflight: { key: string; promise: Promise<LoginResponse> } | null = null;
const recent = new Map<string, { pair: LoginResponse; at: number }>();

export class SessionDeadError extends Error {
  constructor() {
    super("Phiên đăng nhập đã hết hạn.");
    this.name = "SessionDeadError";
  }
}

export class BackendUnavailableError extends Error {
  constructor() {
    super(UNAVAILABLE_DETAIL);
    this.name = "BackendUnavailableError";
  }
}

interface Session {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

function cookieAttributes(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function readSession(): Promise<Session> {
  const store = await cookies();
  return {
    accessToken: store.get(COOKIE_ACCESS)?.value,
    refreshToken: store.get(COOKIE_REFRESH)?.value,
    expiresAt: store.get(COOKIE_EXP)?.value,
  };
}

/** Cookie phiên (refresh token) còn sống → coi như đã đăng nhập. */
export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(COOKIE_REFRESH)?.value);
}

export async function saveSession(pair: LoginResponse): Promise<void> {
  const store = await cookies();
  const expMs = Date.parse(pair.expiresAt);
  const remaining = Number.isNaN(expMs)
    ? ACCESS_MAX_AGE
    : Math.max(0, Math.floor((expMs - Date.now()) / 1000));
  const accessMaxAge = Math.min(ACCESS_MAX_AGE, remaining);

  store.set(COOKIE_ACCESS, pair.accessToken, cookieAttributes(accessMaxAge));
  store.set(COOKIE_EXP, pair.expiresAt, cookieAttributes(accessMaxAge));
  store.set(COOKIE_REFRESH, pair.refreshToken, cookieAttributes(REFRESH_MAX_AGE));
}

export async function clearSession(): Promise<void> {
  recent.clear();
  inflight = null;
  const store = await cookies();
  for (const name of [COOKIE_ACCESS, COOKIE_EXP, COOKIE_REFRESH]) store.delete(name);
}

/** Gọi backend từ server; lỗi mạng → BackendUnavailableError. */
export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, { ...init, cache: "no-store" });
  } catch {
    throw new BackendUnavailableError();
  }
}

// ---------- refresh token (single-flight + cache chống straggler) ----------
//
// Backend dùng refresh token một lần: hai request cùng refresh song song sẽ bị
// coi là dùng lại token cũ và thu hồi toàn bộ phiên của user. Vì vậy mọi request
// tới cùng tiến trình Next dùng chung một promise refresh, và kết quả được giữ
// lại 30s để các request còn cầm token cũ không gọi backend lần nữa.

function pruneRecent(): void {
  const now = Date.now();
  for (const [key, entry] of recent) {
    if (now - entry.at > RECENT_TTL_MS) recent.delete(key);
  }
}

async function requestRefresh(refreshToken: string): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
  } catch {
    throw new BackendUnavailableError();
  }

  if (response.ok) return (await response.json()) as LoginResponse;
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new SessionDeadError();
  }
  throw new BackendUnavailableError();
}

async function refreshTokenPair(refreshToken: string): Promise<LoginResponse> {
  pruneRecent();
  const hit = recent.get(refreshToken);
  if (hit) return hit.pair;

  let pending = inflight?.key === refreshToken ? inflight.promise : null;
  if (!pending) {
    pending = requestRefresh(refreshToken);
    const entry = { key: refreshToken, promise: pending };
    inflight = entry;
    void pending
      .catch(() => undefined)
      .finally(() => {
        if (inflight === entry) inflight = null;
      });
  }

  const pair = await pending;
  recent.set(refreshToken, { pair, at: Date.now() });
  return pair;
}

/**
 * Trả access token hợp lệ (tự refresh khi sắp hết hạn).
 * - Chưa đăng nhập → null.
 * - Refresh token chết → xóa cookie + SessionDeadError.
 * - Lỗi mạng/5xx → BackendUnavailableError (giữ cookie).
 * force = true: backend vừa từ chối access → refresh ngay dù cookie còn hạn.
 */
export async function getAccessToken(force = false): Promise<string | null> {
  const { accessToken, refreshToken, expiresAt } = await readSession();
  if (!accessToken && !refreshToken) return null;

  const expMs = expiresAt ? Date.parse(expiresAt) : NaN;
  if (!force && accessToken && !Number.isNaN(expMs) && expMs - Date.now() > REFRESH_SKEW_MS) {
    return accessToken;
  }

  if (!refreshToken) {
    await clearSession();
    throw new SessionDeadError();
  }

  const pair = await refreshTokenPair(refreshToken);
  await saveSession(pair);
  return pair.accessToken;
}
