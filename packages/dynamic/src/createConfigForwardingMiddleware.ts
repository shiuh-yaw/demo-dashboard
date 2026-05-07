import { type NextRequest, NextResponse } from "next/server";

const DEFAULT_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export interface ConfigForwardingMiddlewareOptions {
  /**
   * Slug used to derive the default cookie name (`<demoType>_config_id`,
   * with hyphens normalized to underscores) and header name
   * (`x-<demoType>-config-id`).
   */
  demoType: string;
  /** Override the auto-derived cookie name. */
  cookieName?: string;
  /** Override the auto-derived header name. */
  headerName?: string;
  /** Cookie lifetime in seconds. Default: 30 days. */
  cookieMaxAge?: number;
}

/**
 * Build a Next.js middleware that:
 *  1. Resolves the active config id from the request (`?theme=<configId>` first,
 *     then the sticky cookie).
 *  2. Forwards the resolved id as `x-<demoType>-config-id` so server
 *     components in `app/layout.tsx` can fetch the brand config.
 *  3. Sticky-cookies the query value across navigations so the brand
 *     persists without `?theme=` in every URL.
 *  4. Empty `?theme=` clears the cookie.
 *
 * No auth gating, no redirects — for client-side-auth apps (wallet,
 * checkouts, shop, deposit) where the Dynamic SDK widget handles login.
 * Apps with server-side protected routes use `createDemoMiddleware`.
 */
export function createConfigForwardingMiddleware(
  opts: ConfigForwardingMiddlewareOptions,
) {
  const cookieName =
    opts.cookieName ?? `${opts.demoType.replace(/-/g, "_")}_config_id`;
  const headerName = opts.headerName ?? `x-${opts.demoType}-config-id`;
  const cookieMaxAge = opts.cookieMaxAge ?? DEFAULT_COOKIE_MAX_AGE;

  return function middleware(request: NextRequest) {
    const queryId = request.nextUrl.searchParams.get("theme");
    const cookieId = request.cookies.get(cookieName)?.value;
    const resolvedId = queryId || cookieId || null;

    const requestHeaders = new Headers(request.headers);
    if (resolvedId) {
      requestHeaders.set(headerName, resolvedId);
    }

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    if (queryId !== null) {
      if (queryId === "") {
        response.cookies.delete(cookieName);
      } else if (queryId !== cookieId) {
        response.cookies.set(cookieName, queryId, {
          maxAge: cookieMaxAge,
          sameSite: "lax",
          path: "/",
        });
      }
    }

    return response;
  };
}
