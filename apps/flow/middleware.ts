import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyBrandedNoIndex } from "@dynamic-demos/dynamic/noindex";

const CONFIG_COOKIE = "flow_config_id";
const CONFIG_HEADER = "x-flow-config-id";
const CONFIG_QUERY_PARAM = "theme";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Also sets `X-Robots-Tag: noindex, nofollow` on branded demo URLs
 * (`?share=` and/or `?theme=` present) via `applyBrandedNoIndex` - the
 * bare `/` URL stays indexable.
 */
export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const queryConfigId = url.searchParams.get(CONFIG_QUERY_PARAM);
  const cookieConfigId = request.cookies.get(CONFIG_COOKIE)?.value ?? null;
  const hasExplicitQuery = url.searchParams.has(CONFIG_QUERY_PARAM);

  const resolvedConfigId =
    hasExplicitQuery && queryConfigId
      ? queryConfigId
      : hasExplicitQuery && !queryConfigId
        ? null
        : cookieConfigId;

  const requestHeaders = new Headers(request.headers);
  if (resolvedConfigId) {
    requestHeaders.set(CONFIG_HEADER, resolvedConfigId);
  } else {
    requestHeaders.delete(CONFIG_HEADER);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (hasExplicitQuery) {
    if (queryConfigId) {
      response.cookies.set(CONFIG_COOKIE, queryConfigId, {
        path: "/",
        maxAge: COOKIE_MAX_AGE_SECONDS,
        sameSite: "strict",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
      });
    } else {
      response.cookies.delete(CONFIG_COOKIE);
    }
  }

  return applyBrandedNoIndex(request, response);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
