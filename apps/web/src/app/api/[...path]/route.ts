import type { NextRequest } from "next/server";

/**
 * Same-origin proxy to the FastAPI service: `/api/v1/sites` → `${LUNARIS_API_URL}/v1/sites`.
 * The API is read-only (GET), so only GET is forwarded, and only its own two roots.
 */
export const dynamic = "force-dynamic";

const ALLOWED_ROOTS = new Set(["health", "v1"]);
const PASS_HEADERS = ["content-type", "x-request-id", "cache-control", "etag"];

function failure(status: number, code: string, message: string, requestId: string | null) {
  return Response.json(
    { error: { code, message, details: [], request_id: requestId ?? "" } },
    { status, headers: requestId ? { "X-Request-ID": requestId } : undefined },
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  const requestId = request.headers.get("x-request-id");
  if (!ALLOWED_ROOTS.has(path[0] ?? "") || path.some((s) => s === ".." || s === ".")) {
    return failure(404, "not_found", "Not found.", requestId);
  }
  const base = process.env.LUNARIS_API_URL ?? "http://127.0.0.1:8000";
  const headers = new Headers({ Accept: "application/json" });
  if (requestId) headers.set("X-Request-ID", requestId);
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, {
      headers,
      signal: request.signal,
      cache: "no-store",
    });
  } catch {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return failure(503, "api_unreachable", "The LUNARSEYE API is not reachable.", requestId);
  }
  const out = new Headers();
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
