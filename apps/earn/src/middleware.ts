import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for route protection
 *
 * IMPORTANT: Middleware runs in Edge Runtime and can only check cookie PRESENCE,
 * not validity. JWT verification requires Node.js runtime (server components).
 *
 * Strategy:
 * - Redirect unauthenticated users (no cookie) away from protected routes
 * - Allow authenticated users (has cookie) to access any route
 * - Let server components handle token verification and redirect if invalid
 *
 * This prevents redirect loops when tokens expire (cookie exists but is invalid).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Dynamic JWT token in cookie (presence only, not verification)
  const authCookie = request.cookies.get("dynamic_jwt");
  const hasCookie = !!authCookie?.value;

  // Public routes that don't require authentication
  const isPublicRoute = pathname.startsWith("/login");

  // Config-based routes (/e/[id]/*) - handled by their own layouts
  const isConfigRoute = pathname.startsWith("/e/");

  // If accessing a public route, always allow
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Config routes (/e/[id]/*) - restrict to earn page only (plus auth routes)
  if (isConfigRoute) {
    // Extract the config ID from the path: /e/[id]/...
    const configMatch = pathname.match(/^\/e\/([^/]+)(\/.*)?$/);
    if (configMatch) {
      const configId = configMatch[1];
      const subPath = configMatch[2] || "";

      // Allow auth routes (/e/[id]/login)
      if (subPath === "/login" || subPath.startsWith("/login")) {
        return NextResponse.next();
      }

      // Allow earn page (/e/[id]/earn or /e/[id]/)
      if (subPath === "/earn" || subPath === "/" || subPath === "") {
        return NextResponse.next();
      }

      // Redirect any other route to earn
      return NextResponse.redirect(new URL(`/e/${configId}/earn`, request.url));
    }
    return NextResponse.next();
  }

  // Protected routes: redirect to login if no cookie
  // (Server components will verify token validity)
  if (!hasCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Has cookie - server components will verify token validity
  // Redirect to /earn (the only valid authenticated route for default dashboard)
  if (pathname !== "/earn") {
    return NextResponse.redirect(new URL("/earn", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
