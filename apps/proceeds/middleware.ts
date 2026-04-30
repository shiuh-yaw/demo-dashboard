import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";

function isPublicRoute(path: string): boolean {
  return path === LOGIN_PATH || path.startsWith(`${LOGIN_PATH}/`);
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasAuthCookie = request.cookies.has("dynamic_jwt");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);

  if (isPublicRoute(path)) {
    if (hasAuthCookie) {
      if (request.nextUrl.searchParams.has("sessionExpired")) {
        const response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        response.cookies.delete("dynamic_jwt");
        return response;
      }

      const returnTo = request.nextUrl.searchParams.get("returnTo");
      const dest = returnTo?.startsWith("/")
        ? returnTo.replace(/\/+$/, "") || "/payment-methods"
        : "/payment-methods";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (path === "/" && hasAuthCookie) {
    return NextResponse.redirect(new URL("/payment-methods", request.url));
  }

  if (!hasAuthCookie) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    const returnTo =
      path === "/"
        ? "/payment-methods"
        : path.replace(/\/$/, "") || "/payment-methods";
    loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
