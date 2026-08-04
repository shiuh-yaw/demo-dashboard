import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** True when the search params carry a branding param (`share` and/or `theme`). */
export function isBrandedSearch(params: URLSearchParams): boolean {
  return params.has("share") || params.has("theme");
}

/**
 * This app has no config-forwarding middleware of its own (no `?theme=`
 * config selector), but branded share links (`?share=`) still route through
 * it, so the noindex protection applies here too. Sets
 * `X-Robots-Tag: noindex, nofollow` on branded demo URLs (`?share=` and/or
 * `?theme=` present); the bare URL stays indexable.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (isBrandedSearch(request.nextUrl.searchParams)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
