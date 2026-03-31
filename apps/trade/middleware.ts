import type { NextRequest } from "next/server";
import { createAuthMiddleware } from "@dynamic-demos/dynamic/middleware";
import { appConfig } from "./app.config";

/**
 * Trade App Middleware
 *
 * Per spec §7.2: On login route, NEVER redirect based on cookie.
 * Client handles redirect when auth valid. Eliminates double redirect when JWT stale.
 */

const authMiddleware = createAuthMiddleware(appConfig, {
  loginPath: "/login",
  loginPathRegex: /^\/login(\/|$)/,
  defaultReturnPath: "/portfolio",
  buildLoginPath: () => "/login",
});

export function middleware(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
