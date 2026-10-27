import {
  BackendUnavailableError,
  backendFetch,
  clearSession,
  readSession,
  UNAVAILABLE_DETAIL,
} from "@/lib/server-auth";
import { problem } from "@/lib/server-response";

/**
 * Đăng xuất: thu hồi refresh token ở backend (best effort) rồi luôn xóa cookie.
 * Lỗi mạng/5xx → 503 và giữ cookie để người dùng thử lại.
 */
export async function POST(): Promise<Response> {
  const { accessToken, refreshToken } = await readSession();

  if (refreshToken) {
    let upstream: Response;
    try {
      upstream = await backendFetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      if (error instanceof BackendUnavailableError) return problem(503, UNAVAILABLE_DETAIL);
      throw error;
    }

    if (upstream.status >= 500) return problem(503, UNAVAILABLE_DETAIL);
  }

  await clearSession();
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
