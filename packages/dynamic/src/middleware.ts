/**
 * Shared auth middleware factory.
 *
 * Per spec §7.2: On login route, NEVER redirect based on cookie.
 * Always NextResponse.next(). Client handles redirect when auth valid.
 * This eliminates double redirect when cookie exists but JWT is invalid.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AppAuthConfig } from "./schema";
import { getSafeRedirectDest } from "./redirect";

export interface MiddlewareConfig {
  /** Login path(s). Flat: "/login". Config: "/r/[id]/login" pattern. */
  loginPath: string;
  /** Regex to match login routes (e.g. /^\/login(\/|$)/ or /^\/r\/[^/]+\/login(\/|$)/) */
  loginPathRegex?: RegExp;
  /** Extract config ID from path (e.g. /r/abc/login -> abc) */
  getConfigIdFromPath?: (path: string) => string | null;
  /** Default return path when no returnTo (e.g. /portfolio or /r/[id]/dashboard) */
  defaultReturnPath: string;
  /** Build login URL for redirect (e.g. /login or /r/[id]/login) */
  buildLoginPath: (configId?: string) => string;
}

/**
 * Create auth middleware from app config.
 * Never redirects FROM login when cookie exists — client handles that.
 */
export function createAuthMiddleware(
  appConfig: AppAuthConfig,
  middlewareConfig: MiddlewareConfig,
) {
  return function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const hasAuthCookie = request.cookies.has("dynamic_jwt");

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", path);

    const configId =
      middlewareConfig.getConfigIdFromPath?.(path) ??
      request.nextUrl.searchParams.get("id");

    const isLoginRoute =
      path === middlewareConfig.loginPath ||
      path.startsWith(`${middlewareConfig.loginPath}/`) ||
      (middlewareConfig.loginPathRegex?.test(path) ?? false);

    const isOAuthCallback =
      request.nextUrl.searchParams.has("dynamicOauthCode") ||
      (request.nextUrl.searchParams.has("code") &&
        request.nextUrl.searchParams.has("state"));

    if (isLoginRoute) {
      // NEVER redirect from login based on cookie. Per spec §7.2.
      // Client runs detectOAuthRedirect + completeSocialAuthentication on mount.
      // If already authenticated (valid JWT), client redirects to returnTo.
      // Exception: sessionExpired param — clear stale cookie and show login
      if (request.nextUrl.searchParams.has("sessionExpired")) {
        const response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        response.cookies.delete("dynamic_jwt");
        return response;
      }
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (!hasAuthCookie) {
      const loginPath = middlewareConfig.buildLoginPath(configId ?? undefined);
      const loginUrl = new URL(loginPath, request.url);
      const returnTo =
        path === "/"
          ? middlewareConfig.defaultReturnPath
          : path.replace(/\/$/, "") || middlewareConfig.defaultReturnPath;
      const safeReturnTo = getSafeRedirectDest(returnTo, request.url);
      loginUrl.searchParams.set("returnTo", safeReturnTo);
      if (configId) {
        loginUrl.searchParams.set("id", configId);
      }
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  };
}
