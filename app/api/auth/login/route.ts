import {
  BackendUnavailableError,
  backendFetch,
  saveSession,
  UNAVAILABLE_DETAIL,
} from "@/lib/server-auth";
import { problem, relay } from "@/lib/server-response";
import type { LoginResponse } from "@/lib/types";

/**
 * Đăng nhập: token do backend trả về được ghi vào cookie httpOnly tại đây,
 * không bao giờ lộ ra response cho JavaScript đọc.
 */
export async function POST(request: Request): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await backendFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    });
  } catch (error) {
    if (error instanceof BackendUnavailableError) return problem(503, UNAVAILABLE_DETAIL);
    throw error;
  }

  if (!upstream.ok) return relay(upstream);

  const pair = (await upstream.json()) as Partial<LoginResponse>;
  if (!pair.accessToken || !pair.refreshToken || !pair.expiresAt) {
    return problem(502, UNAVAILABLE_DETAIL);
  }

  await saveSession({
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    expiresAt: pair.expiresAt,
  });

  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
