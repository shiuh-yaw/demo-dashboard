import { type NextRequest, NextResponse } from "next/server";
import { applyBrandedNoIndex } from "./noindex";

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
 *  5. Same contract for `?scope=<page|widget>` → `x-<demoType>-theme-scope`
 *     (how much of the page the brand theme owns; the app decides the
 *     default and validates the value).
 *
 * No auth gating, no redirects — for client-side-auth apps (wallet,
 * checkouts, shop, deposit) where the Dynamic SDK widget handles login.
 * Apps with server-side protected routes use `createDemoMiddleware`.
 *
 * Every response also carries `X-Robots-Tag: noindex, nofollow` when the
 * request is a branded demo URL (`?share=` and/or `?theme=` present) - see
 * `./noindex`. Bare demo URLs stay indexable.
 */
export function createConfigForwardingMiddleware(
  opts: ConfigForwardingMiddlewareOptions,
) {
  const slug = opts.demoType.replace(/-/g, "_");
  const cookieName = opts.cookieName ?? `${slug}_config_id`;
  const headerName = opts.headerName ?? `x-${opts.demoType}-config-id`;
  const scopeCookieName = `${slug}_theme_scope`;
  const scopeHeaderName = `x-${opts.demoType}-theme-scope`;
  const cookieMaxAge = opts.cookieMaxAge ?? DEFAULT_COOKIE_MAX_AGE;

  return function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);

    // Resolve a sticky query/cookie pair. An explicit empty param is a
    // clear: resolve to the default on THIS request — cookie deletion
    // below only affects future requests, and falling back to the
    // cookie here made clearing take two loads.
    const resolveSticky = (param: string, cookie: string, header: string) => {
      const queryValue = request.nextUrl.searchParams.get(param);
      const cookieValue = request.cookies.get(cookie)?.value;
      const resolved =
        queryValue !== null ? queryValue || null : cookieValue || null;
      if (resolved) requestHeaders.set(header, resolved);
      return { queryValue, cookieValue };
    };

    const theme = resolveSticky("theme", cookieName, headerName);
    const scope = resolveSticky("scope", scopeCookieName, scopeHeaderName);

    const res = NextResponse.next({ request: { headers: requestHeaders } });

    const persistSticky = (
      { queryValue, cookieValue }: { queryValue: string | null; cookieValue?: string },
      cookie: string,
    ) => {
      if (queryValue === null) return;
      if (queryValue === "") {
        res.cookies.delete(cookie);
      } else if (queryValue !== cookieValue) {
        res.cookies.set(cookie, queryValue, {
          maxAge: cookieMaxAge,
          sameSite: "lax",
          path: "/",
        });
      }
    };

    persistSticky(theme, cookieName);
    persistSticky(scope, scopeCookieName);

    return applyBrandedNoIndex(request, res);
  };
}
