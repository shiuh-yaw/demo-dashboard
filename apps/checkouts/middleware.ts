import { type NextRequest, NextRequest as NextRequestCtor } from "next/server";
import { createConfigForwardingMiddleware } from "@dynamic-demos/dynamic/config-forwarder";

/**
 * All checkouts routes are public — auth happens client-side inside the
 * Dynamic SDK widget. We use the shared config-forwarding middleware
 * (header + sticky cookie) for query/cookie handling, but checkouts
 * also accepts the config id via path (`/w/[id]/...`) for legacy
 * embeds. We extract the path id and re-attach it as `?theme=` before
 * delegating to the shared factory so all three sources (path, query,
 * cookie) flow through one cookie + header pipeline.
 */
const PATH_RE = /^\/w\/([^/]+)/;
const forwarder = createConfigForwardingMiddleware({ demoType: "checkouts" });

export function middleware(request: NextRequest) {
  const pathId = request.nextUrl.pathname.match(PATH_RE)?.[1];
  if (pathId && !request.nextUrl.searchParams.get("theme")) {
    const url = request.nextUrl.clone();
    url.searchParams.set("theme", pathId);
    return forwarder(new NextRequestCtor(url, request));
  }
  return forwarder(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
