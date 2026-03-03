import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";

function isPublicRoute(path: string): boolean {
  if (path === LOGIN_PATH || path.startsWith(`${LOGIN_PATH}/`)) return true;
  // Config-based login: /r/[id]/login
  if (/^\/r\/[^/]+\/login(\/|$)/.test(path)) return true;
  return false;
}

function isConfigKycRoute(path: string): boolean {
  return /^\/r\/[^/]+\/kyc(\/|$)/.test(path);
}

/**
 * All routes are protected except /login.
 * Redirects unauthenticated users to /login with returnTo.
 * Sets x-pathname header for server components that may need to redirect.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasAuthCookie = request.cookies.has("dynamic_jwt");

  const configId = request.nextUrl.searchParams.get("id");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);

  // Set config ID for styles/layout — from path for /r/[id]/* or from ?id= query
  const configPathMatch = path.match(/^\/r\/([^/]+)/);
  const pathConfigId = configPathMatch?.[1];
  const resolvedConfigId = pathConfigId ?? configId;
  if (resolvedConfigId) {
    requestHeaders.set("x-remittance-config-id", resolvedConfigId);
  }

  if (isPublicRoute(path) || isConfigKycRoute(path)) {
    // Authenticated user on login? Redirect to returnTo immediately (skip OAuth callback)
    const isLoginRoute =
      path === LOGIN_PATH ||
      path.startsWith(`${LOGIN_PATH}/`) ||
      /^\/r\/[^/]+\/login(\/|$)/.test(path);
    const isOAuthCallback =
      request.nextUrl.searchParams.has("dynamicOauthCode") ||
      (request.nextUrl.searchParams.has("code") &&
        request.nextUrl.searchParams.has("state"));

    if (isLoginRoute && hasAuthCookie && !isOAuthCallback) {
      // Server flagged JWT as expired/invalid — clear the stale cookie and show login
      if (request.nextUrl.searchParams.has("sessionExpired")) {
        const response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        response.cookies.delete("dynamic_jwt");
        return response;
      }

      const returnToParam = request.nextUrl.searchParams.get("returnTo");
      const dest = returnToParam?.startsWith("/")
        ? returnToParam.replace(/\/+$/, "") || "/"
        : returnToParam
          ? `/${returnToParam}`.replace(/\/+$/, "") || "/"
          : pathConfigId
            ? `/r/${pathConfigId}/dashboard`
            : "/";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!hasAuthCookie) {
    // For /r/[id]/* routes, redirect to /r/[id]/login
    if (pathConfigId) {
      const loginUrl = new URL(`/r/${pathConfigId}/login`, request.url);
      const returnTo =
        path.replace(/\/$/, "") || `/r/${pathConfigId}/dashboard`;
      loginUrl.searchParams.set("returnTo", returnTo);
      return NextResponse.redirect(loginUrl);
    }
    // Default: redirect to /login
    const loginUrl = new URL(LOGIN_PATH, request.url);
    let returnTo = path === "/" ? "/" : path.replace(/\/$/, "") || "/";
    if (configId)
      returnTo = `${returnTo}${returnTo.includes("?") ? "&" : "?"}id=${configId}`;
    loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and API routes.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
