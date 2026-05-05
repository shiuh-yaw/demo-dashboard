import { NextRequest, type NextResponse } from "next/server";

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

export function isRedirect(res: NextResponse | Response): boolean {
  return res.status >= 300 && res.status < 400;
}

/**
 * Check whether the response is a Next.js rewrite (NextResponse.rewrite()).
 * Rewrites set the destination URL in `x-middleware-rewrite`.
 */
export function getRewriteTarget(res: NextResponse): string | null {
  return res.headers.get("x-middleware-rewrite");
}
