import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const VISA_DIRECT_CONFIG_COOKIE = "visa_direct_config_id";
const CONFIG_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function isPublicRoute(path: string): boolean {
  return path === LOGIN_PATH || path.startsWith(`${LOGIN_PATH}/`);
}

/**
 * All routes are protected except /login.
 *
 * Branding binding:
 *  - `?id=<configId>` sets `visa_direct_config_id` cookie (stickiness) and
 *    forwards the id as `x-visa-direct-config-id` header to the layout.
 *  - `?id=` (empty) clears the cookie — useful for resetting back to
 *    unbranded (Dynamic) defaults.
 *  - Otherwise the cookie is used.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasAuthCookie = request.cookies.has("dynamic_jwt");

  const idParam = request.nextUrl.searchParams.get("id");
  const cookieConfigId = request.cookies.get(VISA_DIRECT_CONFIG_COOKIE)?.value;
  const explicitlyClearingConfig = idParam !== null && idParam.trim() === "";
  const resolvedConfigId = explicitlyClearingConfig
    ? undefined
    : (idParam?.trim() || cookieConfigId);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);
  if (resolvedConfigId) {
    requestHeaders.set("x-visa-direct-config-id", resolvedConfigId);
  }

  const syncConfigCookie = (response: NextResponse) => {
    if (explicitlyClearingConfig) {
      response.cookies.delete(VISA_DIRECT_CONFIG_COOKIE);
    } else if (idParam && idParam.trim() && idParam.trim() !== cookieConfigId) {
      response.cookies.set(VISA_DIRECT_CONFIG_COOKIE, idParam.trim(), {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: CONFIG_COOKIE_MAX_AGE,
      });
    }
    return response;
  };

  if (isPublicRoute(path)) {
    const isOAuthCallback =
      request.nextUrl.searchParams.has("dynamicOauthCode") ||
      (request.nextUrl.searchParams.has("code") &&
        request.nextUrl.searchParams.has("state"));

    if (hasAuthCookie && !isOAuthCallback) {
      if (request.nextUrl.searchParams.has("sessionExpired")) {
        const response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        response.cookies.delete("dynamic_jwt");
        return syncConfigCookie(response);
      }

      const returnTo = request.nextUrl.searchParams.get("returnTo");
      const dest = returnTo?.startsWith("/")
        ? returnTo.replace(/\/+$/, "") || "/payment-methods"
        : "/payment-methods";
      return syncConfigCookie(NextResponse.redirect(new URL(dest, request.url)));
    }

    return syncConfigCookie(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  // Redirect / to /payment-methods for authenticated users
  if (path === "/" && hasAuthCookie) {
    return syncConfigCookie(
      NextResponse.redirect(new URL("/payment-methods", request.url)),
    );
  }

  if (!hasAuthCookie) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    const returnTo = path === "/" ? "/payment-methods" : path.replace(/\/$/, "") || "/payment-methods";
    loginUrl.searchParams.set("returnTo", returnTo);
    return syncConfigCookie(NextResponse.redirect(loginUrl));
  }

  return syncConfigCookie(
    NextResponse.next({ request: { headers: requestHeaders } }),
  );
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
