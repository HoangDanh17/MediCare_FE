const NO_STORE = "no-store";

export function problem(status: number, detail: string): Response {
  return Response.json(
    { type: "about:blank", title: detail, status, detail },
    { status, headers: { "cache-control": NO_STORE } },
  );
}

/** Chuyển nguyên trạng status/body của backend về trình duyệt. */
export async function relay(upstream: Response): Promise<Response> {
  const headers = new Headers({ "cache-control": NO_STORE });
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  if (upstream.status === 204 || upstream.status === 205 || upstream.status === 304) {
    return new Response(null, { status: upstream.status, headers });
  }

  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers });
}
