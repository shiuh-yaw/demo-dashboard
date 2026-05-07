/**
 * Canonical demo middleware factory (D-008).
 *
 * Generalizes the visa-direct cookie + auth-redirect pattern. Each demo app
 * wires it with its `demoType` slug; the factory derives:
 *   - cookie name:   `<demoType_with_underscores>_config_id` (Dynamic idiom)
 *   - header name:   `x-<demoType>-config-id`
 *
 * Behaviors (defaults):
 *   - `?theme=<configId>` → set/overwrite cookie, forward as `x-<demoType>-config-id`.
 *   - `?theme=` (empty)   → clear cookie.
 *   - Authenticated user on a public/login route with `?sessionExpired=1` → clear `dynamic_jwt`.
 *   - Authenticated user on login (no OAuth params) → redirect to `returnTo` or `defaultReturnPath`.
 *   - OAuth callback (`dynamicOauthCode` by default) on login → pass through.
 *   - Unauthenticated user on protected route → redirect to `loginPath?returnTo=…`.
 *   - Authenticated user on `/` may be redirected to `authenticatedRootRedirect`.
 *
 * Knobs (research-backed; see docs/projects/demo-meta-system/research/dynamic-auth-patterns.md):
 *   - `configIdSource`: 'query' | 'path' | 'both' | 'none'.
 *   - `stickyConfigCookie`: whether the resolved config-id is persisted as a cookie.
 *   - `oauthCallbackParams`: query params that exempt the request from the auth gate.
 *   - `carryReturnTo`: whether to round-trip `?returnTo=` on auth-redirect.
 *   - `cookieName`: explicit override for the config-id cookie name.
 *   - `authenticatedRootRedirect`: where authed users on `/` are sent.
 *
 * Apps with bespoke route rewriting (e.g. trade's `/t/[id]/*`) supply
 * `rewritePath` + `getConfigIdFromPath` to extract config id from the URL path.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export type PublicRouteMatcher = string | RegExp;

export type ConfigIdSource = "query" | "path" | "both" | "none";

export interface CreateDemoMiddlewareOptions {
  /** Slug used to derive cookie name and `x-<demoType>-config-id` header. */
  demoType: string;
  /**
   * Routes that bypass auth.
   * - `string`: matches when `path === entry` OR `path.startsWith(entry + "/")`.
   * - `RegExp`: tested against the pathname (e.g. `/^\/r\/[^/]+\/login(\/|$)/`).
   * Default: `["/login"]`.
   */
  publicRoutes?: PublicRouteMatcher[];
  /**
   * Path to redirect unauthenticated users to. May also be a function for
   * config-aware login routes (e.g. `/r/[id]/login`).
   * Default: first string entry of `publicRoutes` or `/login`.
   */
  loginPath?: string | ((configId: string | undefined) => string);
  /** Default destination for authenticated users on login (no `returnTo`). */
  defaultReturnPath: string | ((configId: string | undefined) => string);
  /** Cookie name holding the JWT. Default: `dynamic_jwt`. */
  authCookieName?: string;
  /** Cookie max-age for config id. Default: 30 days. */
  configCookieMaxAge?: number;
  /** Optional config-id extractor for path-based routes (e.g. `/r/[id]/...`). */
  getConfigIdFromPath?: (path: string) => string | null;
  /**
   * Optional path rewriter for config-prefix routes that need to be
   * dispatched to a flat app structure (e.g. trade rewrites
   * `/t/[id]/portfolio` → `/portfolio`).
   *
   * When supplied AND the rewrite differs from the original path, the
   * middleware uses `NextResponse.rewrite` to dispatch to the rewritten
   * path while keeping the original URL in the address bar.
   */
  rewritePath?: (path: string, configId: string | null) => string;

  // ---- Phase 1D research-backed knobs ----

  /**
   * How to source the config id.
   *   - `'query'` (default): only `?theme=` resolves a config id.
   *   - `'path'`: only `getConfigIdFromPath` resolves it.
   *   - `'both'`: path takes precedence; query falls back.
   *   - `'none'`: no config id is resolved; cookie + header sync are skipped.
   *
   * When `'query'`, the path-extractor still runs (used for rewrites/login
   * pathing) but its value is NOT persisted to the cookie. Only `?theme=` writes
   * the cookie.
   *
   * Default: `'query'`.
   */
  configIdSource?: ConfigIdSource;

  /**
   * Whether to persist the resolved config id as a cookie. Set to `false`
   * for header-only forwarding (remittance pattern). Header forwarding still
   * happens when a config id resolves; only the `Set-Cookie` write is skipped.
   *
   * Default: `true`.
   */
  stickyConfigCookie?: boolean;

  /**
   * URL query params that signal an OAuth callback. Presence of any listed
   * param on a public/login route exempts the request from the
   * "authenticated → redirect away" branch (so the page can call
   * `completeSocialAuthentication`).
   *
   * Default: `['dynamicOauthCode']` (Dynamic SDK convention).
   */
  oauthCallbackParams?: string[];

  /**
   * Whether to round-trip `?returnTo=<path>` on auth-redirect. When `true`,
   * the original path (plus any non-`?theme=` query params) is encoded so the
   * login page can return the user to where they came from.
   *
   * Default: `true`.
   */
  carryReturnTo?: boolean;

  /**
   * Explicit override for the config-id cookie name. When omitted, derived
   * as `${demoType.replace(/-/g, '_')}_config_id` (Dynamic idiom; matches
   * existing `visa_direct_config_id`).
   */
  cookieName?: string;

  /**
   * Where to redirect authenticated users requesting `/`. When `'/'` (the
   * default), `/` passes through. Set to e.g. `/payment-methods` to bounce
   * authenticated root requests to a landing page (visa-direct, proceeds).
   *
   * Default: `'/'` (no redirect).
   */
  authenticatedRootRedirect?: string;
}

const DEFAULT_AUTH_COOKIE = "dynamic_jwt";
const DEFAULT_CONFIG_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const DEFAULT_OAUTH_CALLBACK_PARAMS: readonly string[] = ["dynamicOauthCode"];

function hasOAuthCallback(req: NextRequest, params: readonly string[]): boolean {
  const sp = req.nextUrl.searchParams;
  return params.some((p) => sp.has(p));
}

function safeReturnTo(returnToParam: string | null, fallback: string): string {
  if (!returnToParam) return fallback;
  const trimmed = returnToParam.trim();
  if (!trimmed) return fallback;
  // Bare relative path (no leading slash, no protocol) → normalize to `/<value>`.
  // Reject anything containing `://` or starting with `//` (protocol-relative).
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) return fallback;
    const cleaned = trimmed.replace(/\/+$/, "");
    return cleaned || fallback;
  }
  // Bare token like "foo" → "/foo". Reject anything host-like (contains `.` or `:`).
  if (/[.:/\\]/.test(trimmed)) return fallback;
  return `/${trimmed}`;
}

export function createDemoMiddleware(opts: CreateDemoMiddlewareOptions) {
  const {
    demoType,
    publicRoutes = ["/login"],
    defaultReturnPath,
    authCookieName = DEFAULT_AUTH_COOKIE,
    configCookieMaxAge = DEFAULT_CONFIG_COOKIE_MAX_AGE,
    getConfigIdFromPath,
    rewritePath,
    configIdSource = "query",
    stickyConfigCookie = true,
    oauthCallbackParams = DEFAULT_OAUTH_CALLBACK_PARAMS,
    carryReturnTo = true,
    authenticatedRootRedirect = "/",
  } = opts;

  const firstStringRoute = publicRoutes.find(
    (r): r is string => typeof r === "string",
  );
  const loginPathOpt = opts.loginPath ?? firstStringRoute ?? "/login";

  const resolveLoginPath = (configId: string | undefined): string =>
    typeof loginPathOpt === "function" ? loginPathOpt(configId) : loginPathOpt;
  const resolveDefaultReturnPath = (configId: string | undefined): string =>
    typeof defaultReturnPath === "function"
      ? defaultReturnPath(configId)
      : defaultReturnPath;

  const configCookieName =
    opts.cookieName ?? `${demoType.replace(/-/g, "_")}_config_id`;
  const configHeaderName = `x-${demoType}-config-id`;

  function isPublic(path: string): boolean {
    return publicRoutes.some((pub) => {
      if (typeof pub === "string") {
        return path === pub || path.startsWith(`${pub}/`);
      }
      return pub.test(path);
    });
  }

  return function middleware(request: NextRequest): NextResponse {
    const path = request.nextUrl.pathname;
    const hasAuth = request.cookies.has(authCookieName);

    // Resolve config id according to configIdSource. Empty `?theme=` always
    // means "clear" when query is in scope.
    const idParam = request.nextUrl.searchParams.get("theme");
    const cookieConfigId = stickyConfigCookie
      ? request.cookies.get(configCookieName)?.value
      : undefined;
    const pathConfigId = getConfigIdFromPath?.(path) ?? null;

    const explicitlyClearing =
      configIdSource !== "none" &&
      configIdSource !== "path" &&
      idParam !== null &&
      idParam.trim() === "";
    const queryConfigId = idParam?.trim() || null;

    let resolvedConfigId: string | undefined;
    if (configIdSource === "none") {
      resolvedConfigId = undefined;
    } else if (explicitlyClearing) {
      resolvedConfigId = undefined;
    } else if (configIdSource === "query") {
      resolvedConfigId = queryConfigId ?? cookieConfigId;
    } else {
      // 'path' and 'both' — for header resolution, both consult query as
      // a fallback so apps can deep-link via `?theme=` even when path drives
      // the cookie. The distinction between 'path' and 'both' lives in
      // `syncConfigCookie` (cookie write policy), not here.
      resolvedConfigId =
        pathConfigId ?? queryConfigId ?? cookieConfigId;
    }

    // Path-extractor still runs unconditionally so rewrites + login pathing
    // can leverage it even when configIdSource excludes path.
    const rewrittenPath = rewritePath?.(path, pathConfigId) ?? path;
    const isRewritten = rewrittenPath !== path;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", path);
    if (resolvedConfigId) {
      requestHeaders.set(configHeaderName, resolvedConfigId);
    }

    const buildPassThrough = (clearAuth = false): NextResponse => {
      let response: NextResponse;
      if (isRewritten) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = rewrittenPath;
        response = NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        });
      } else {
        response = NextResponse.next({ request: { headers: requestHeaders } });
      }
      if (clearAuth) response.cookies.delete(authCookieName);
      return response;
    };

    const syncConfigCookie = (response: NextResponse) => {
      if (configIdSource === "none" || !stickyConfigCookie) {
        return response;
      }
      if (explicitlyClearing) {
        response.cookies.delete(configCookieName);
        return response;
      }
      // Determine the candidate id according to source.
      let candidate: string | null = null;
      if (configIdSource === "query") {
        candidate = queryConfigId;
      } else if (configIdSource === "path") {
        candidate = pathConfigId;
      } else {
        // 'both' — prefer path, fall back to query.
        candidate = pathConfigId ?? queryConfigId;
      }
      if (candidate && candidate !== cookieConfigId) {
        response.cookies.set(configCookieName, candidate, {
          httpOnly: false,
          sameSite: "lax",
          path: "/",
          maxAge: configCookieMaxAge,
        });
      }
      return response;
    };

    const fallbackReturn = resolveDefaultReturnPath(resolvedConfigId);

    // Public-route matching uses the rewritten path so /t/[id]/login is
    // treated the same as /login.
    if (isPublic(rewrittenPath)) {
      const oauth = hasOAuthCallback(request, oauthCallbackParams);

      if (hasAuth && !oauth) {
        if (request.nextUrl.searchParams.has("sessionExpired")) {
          return syncConfigCookie(buildPassThrough(true));
        }

        const returnToParam = request.nextUrl.searchParams.get("returnTo");
        const dest = safeReturnTo(returnToParam, fallbackReturn);
        return syncConfigCookie(
          NextResponse.redirect(new URL(dest, request.url)),
        );
      }

      // Unauthenticated, OAuth callback, or already on login: pass through.
      return syncConfigCookie(buildPassThrough());
    }

    if (!hasAuth) {
      // The login path is selected from the URL path's config id only
      // (config-aware login routes like `/r/<id>/login` are path-scoped). A
      // bare `?theme=` on a non-config path should NOT bounce the user into a
      // config-aware login route they never visited.
      const loginPath = resolveLoginPath(pathConfigId ?? undefined);
      const url = new URL(loginPath, request.url);
      if (carryReturnTo) {
        // Build returnTo from the original path, preserving non-`id` query
        // params (so /dashboard?theme=brand&foo=bar → returnTo=/dashboard?foo=bar
        // when configIdSource omits the query, OR /dashboard?theme=brand&foo=bar
        // when the id is meaningful).
        // Per remittance test "B. ?theme=brandX -> returnTo=/dashboard?theme=brandX",
        // the `?theme=` is preserved when present.
        let returnToBase: string;
        if (path === "/") {
          returnToBase = fallbackReturn;
        } else {
          returnToBase = path.replace(/\/$/, "") || fallbackReturn;
        }
        // Preserve the original query string verbatim (minus any sessionExpired flag).
        const originalParams = new URLSearchParams(
          request.nextUrl.searchParams,
        );
        originalParams.delete("sessionExpired");
        originalParams.delete("returnTo");
        const qs = originalParams.toString();
        const returnTo = qs ? `${returnToBase}?${qs}` : returnToBase;
        url.searchParams.set("returnTo", returnTo);
        if (resolvedConfigId) url.searchParams.set("theme", resolvedConfigId);
      } else if (resolvedConfigId) {
        url.searchParams.set("theme", resolvedConfigId);
      }
      return syncConfigCookie(NextResponse.redirect(url));
    }

    // Authenticated user — handle authenticated root redirect.
    if (
      authenticatedRootRedirect &&
      authenticatedRootRedirect !== "/" &&
      path === "/"
    ) {
      return syncConfigCookie(
        NextResponse.redirect(
          new URL(authenticatedRootRedirect, request.url),
        ),
      );
    }

    return syncConfigCookie(buildPassThrough());
  };
}
