import { NextRequest, type NextResponse } from "next/server";

/**
 * Build a NextRequest fixture for middleware characterization tests.
 *
 * Cookies provided here are populated on the request via NextRequest's cookie API
 * (so `request.cookies.has(...)` / `.get(...)` resolve them, matching production).
 * Headers are merged onto the request's standard Headers object.
 */
export function makeRequest(opts: {
  url: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  method?: string;
}): NextRequest {
  const fullUrl = new URL(opts.url, "http://localhost");
  const headers = new Headers(opts.headers);
  const req = new NextRequest(fullUrl, {
    method: opts.method ?? "GET",
    headers,
  });
  if (opts.cookies) {
    for (const [k, v] of Object.entries(opts.cookies)) {
      req.cookies.set(k, v);
    }
  }
  return req;
}

/**
 * NextResponse.next({ request: { headers } }) does NOT physically replace
 * incoming request headers on the response. Instead, Next.js encodes the
 * forwarded headers via two response headers:
 *   x-middleware-override-headers: comma-separated list of header names
 *   x-middleware-request-<header-name>: the (case-folded) value of that header
 *
 * This helper extracts the forwarded value for a given header name, returning
 * null if the header was not forwarded.
 */
export function getForwardedRequestHeader(
  res: NextResponse,
  headerName: string,
): string | null {
  const overrideList = res.headers.get("x-middleware-override-headers");
  if (!overrideList) return null;
  const lower = headerName.toLowerCase();
  const names = overrideList.split(",").map((n) => n.trim().toLowerCase());
  if (!names.includes(lower)) return null;
  return res.headers.get(`x-middleware-request-${lower}`);
}

/**
 * Indicates whether the response is a redirect (3xx).
 */
export function isRedirect(res: NextResponse | Response): boolean {
  return res.status >= 300 && res.status < 400;
}
