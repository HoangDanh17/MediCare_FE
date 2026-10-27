import type { NextRequest } from "next/server";

import {
  BackendUnavailableError,
  backendFetch,
  clearSession,
  getAccessToken,
  SessionDeadError,
  UNAVAILABLE_DETAIL,
} from "@/lib/server-auth";
import { problem, relay } from "@/lib/server-response";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

/** Endpoint chỉ dùng nội bộ ở server, không cho trình duyệt gọi trực tiếp. */
function isInternal(path: string[]): boolean {
  if (path.some((segment) => segment === "" || segment === "." || segment === "..")) return true;
  return path[0] === "auth" && (path[1] === "login" || path[1] === "refresh");
}

async function sessionFailure(error: unknown): Promise<Response> {
  if (error instanceof SessionDeadError) {
    await clearSession();
    return problem(401, "Phiên đăng nhập đã hết hạn.");
  }
  if (error instanceof BackendUnavailableError) return problem(503, UNAVAILABLE_DETAIL);
  throw error;
}

/**
 * BFF proxy: trình duyệt gọi /api/... trên Next, Next gắn Bearer token rồi
 * chuyển tiếp tới backend. Token nằm trong cookie httpOnly, JS không đọc được,
 * và backend không cần public port / CORS.
 */
async function handle(request: NextRequest, { params }: Context): Promise<Response> {
  const { path } = await params;
  if (isInternal(path)) return problem(404, "Không tìm thấy.");

  const target = `/api/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";

  const body = hasBody ? await request.arrayBuffer() : undefined;
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  const send = (token: string | null) =>
    backendFetch(target, {
      method,
      body,
      headers: {
        ...(body !== undefined && contentType ? { "Content-Type": contentType } : {}),
        ...(accept ? { Accept: accept } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let token: string | null;
  try {
    token = await getAccessToken();
  } catch (error) {
    return sessionFailure(error);
  }

  let upstream: Response;
  try {
    upstream = await send(token);
  } catch (error) {
    return sessionFailure(error);
  }

  // Access token bị backend từ chối giữa chừng → refresh cưỡng bức rồi thử lại 1 lần.
  if (upstream.status === 401 && token) {
    try {
      token = await getAccessToken(true);
      upstream = await send(token);
    } catch (error) {
      return sessionFailure(error);
    }
  }

  if (upstream.status === 401) await clearSession();

  return relay(upstream);
}

export function GET(request: NextRequest, context: Context) {
  return handle(request, context);
}

export function POST(request: NextRequest, context: Context) {
  return handle(request, context);
}

export function PUT(request: NextRequest, context: Context) {
  return handle(request, context);
}

export function PATCH(request: NextRequest, context: Context) {
  return handle(request, context);
}

export function DELETE(request: NextRequest, context: Context) {
  return handle(request, context);
}

export function HEAD(request: NextRequest, context: Context) {
  return handle(request, context);
}
