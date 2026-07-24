import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-dynamic-environment-id, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
  "Access-Control-Max-Age": "86400",
};

// Tracker endpoints own their CORS (exact-origin allowlist in track-cors.ts);
// the wildcard below must never reach them.
const EXACT_CORS_PATHS = ["/api/events", "/api/share/context"];

// Top-level segments wrapped by `app/(operator)/layout.tsx`. Forwarded as
// `x-pathname` so that layout can tell whether a request is already headed to
// the onboarding welcome route (`ONBOARDING_WELCOME_PATH`) without redirecting
// into a loop - App Router server layouts have no other way to read the
// current pathname.
const OPERATOR_PATH_PREFIXES = [
  "/dashboard",
  "/prospects",
  "/remittance",
  "/trade",
  "/checkouts",
  "/earns",
  "/visa-direct",
  "/wallets",
  "/widgets",
  "/documentation",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    if (EXACT_CORS_PATHS.some((path) => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Handle preflight OPTIONS requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // For all other API requests, add CORS headers to the response
    const response = NextResponse.next();
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  if (OPERATOR_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/prospects/:path*",
    "/remittance/:path*",
    "/trade/:path*",
    "/checkouts/:path*",
    "/earns/:path*",
    "/visa-direct/:path*",
    "/wallets/:path*",
    "/widgets/:path*",
    "/documentation/:path*",
  ],
};
