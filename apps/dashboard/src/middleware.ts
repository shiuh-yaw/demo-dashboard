import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-dynamic-environment-id, x-rain-card-id, x-rain-user-id, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
  "Access-Control-Max-Age": "86400",
};

// Tracker endpoints own their CORS (exact-origin allowlist in track-cors.ts);
// the wildcard below must never reach them.
const EXACT_CORS_PATHS = ["/api/events", "/api/share/context"];

// API CORS only. Onboarding is a plain cookie check in the operator layout
// (`app/(operator)/layout.tsx`), not a middleware redirect - so middleware no
// longer touches operator page routes at all.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (EXACT_CORS_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const response = NextResponse.next();
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
