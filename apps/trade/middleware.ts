import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { appConfig } from "./app.config";

const LOGIN_PATH = "/login";
const TRADE_CONFIG_COOKIE = "trade_config_id";

function parseConfigRoute(path: string): { configId: string; strippedPath: string } | null {
  const match = path.match(/^\/t\/([^/]+)(\/.*)?$/);
  if (!match) return null;
  const configId = match[1]!;
  const rest = match[2] ?? "";
  // Avoid app index redirect from "/" -> "/portfolio" so the URL can stay "/t/:id"
  const strippedPath = rest === "" ? appConfig.defaultReturnPath : rest;
  return { configId, strippedPath };
}

function isPublicRoute(path: string): boolean {
  return path === LOGIN_PATH || path.startsWith(`${LOGIN_PATH}/`);
}

function normalizeReturnPath(path: string, fallback: string): string {
  if (!path || path === "/") return fallback;
  return path.replace(/\/$/, "") || fallback;
}

export function middleware(request: NextRequest) {
  const originalPath = request.nextUrl.pathname;
  const hasAuthCookie = request.cookies.has("dynamic_jwt");
  const routeInfo = parseConfigRoute(originalPath);

  const queryConfigId = request.nextUrl.searchParams.get("id");
  const cookieConfigId = request.cookies.get(TRADE_CONFIG_COOKIE)?.value;
  const resolvedConfigId = routeInfo?.configId ?? queryConfigId ?? cookieConfigId;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", originalPath);
  if (resolvedConfigId) {
    requestHeaders.set("x-trade-config-id", resolvedConfigId);
  }

  const pathForRouting = routeInfo?.strippedPath ?? originalPath;
  const isLoginRoute = isPublicRoute(pathForRouting);
  const isOAuthCallback =
    request.nextUrl.searchParams.has("dynamicOauthCode") ||
    (request.nextUrl.searchParams.has("code") &&
      request.nextUrl.searchParams.has("state"));

  const attachConfigCookie = (response: NextResponse) => {
    if (routeInfo?.configId) {
      response.cookies.set(TRADE_CONFIG_COOKIE, routeInfo.configId, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  };

  const continueRequest = (clearSessionCookie = false) => {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = pathForRouting;
    const response = routeInfo
      ? NextResponse.rewrite(rewritten, { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });
    if (clearSessionCookie) {
      response.cookies.delete("dynamic_jwt");
    }
    return attachConfigCookie(response);
  };

  if (isLoginRoute) {
    // Never redirect away from login based only on cookie during OAuth callback.
    if (hasAuthCookie && !isOAuthCallback) {
      if (request.nextUrl.searchParams.has("sessionExpired")) {
        return continueRequest(true);
      }

      const returnToParam = request.nextUrl.searchParams.get("returnTo");
      const fallback = routeInfo?.configId
        ? `/t/${routeInfo.configId}${appConfig.defaultReturnPath}`
        : appConfig.defaultReturnPath;
      const destination = normalizeReturnPath(returnToParam || "", fallback);
      return attachConfigCookie(NextResponse.redirect(new URL(destination, request.url)));
    }

    return continueRequest();
  }

  if (!hasAuthCookie) {
    const loginPath = routeInfo?.configId ? `/t/${routeInfo.configId}/login` : LOGIN_PATH;
    const loginUrl = new URL(loginPath, request.url);
    const fallback = routeInfo?.configId
      ? `/t/${routeInfo.configId}${appConfig.defaultReturnPath}`
      : appConfig.defaultReturnPath;
    const returnTo = normalizeReturnPath(originalPath, fallback);
    loginUrl.searchParams.set("returnTo", returnTo);
    return attachConfigCookie(NextResponse.redirect(loginUrl));
  }

  return continueRequest();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
