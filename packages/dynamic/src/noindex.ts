/**
 * Branded-demo noindex (GTM share-link privacy). A demo response is
 * "branded" exactly when its URL carries `share` and/or `theme` - the
 * params `buildBrandedLaunchUrl` sets and `/s/[token]` redirects to
 * (see `apps/dashboard/src/lib/share-links/launch-url.ts`). Branded
 * responses must not be indexed; the bare demo URL stays indexable.
 *
 * HTTP header over client meta tag on purpose: a JS-only noindex is
 * exactly how branded pages leak to crawlers that don't run JS.
 */

import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

export const NOINDEX_HEADER = "X-Robots-Tag";
export const NOINDEX_VALUE = "noindex, nofollow";

/** True when the search params carry a branding param (`share` and/or `theme`). */
export function isBrandedSearch(params: URLSearchParams): boolean {
  return params.has("share") || params.has("theme");
}

/**
 * Sets `X-Robots-Tag: noindex, nofollow` on `response` when `request` is a
 * branded demo URL. Mutates and returns `response` so it composes with any
 * existing return path (redirect, rewrite, or pass-through).
 */
export function applyBrandedNoIndex<T extends NextResponse>(
  request: NextRequest,
  response: T,
): T {
  if (isBrandedSearch(request.nextUrl.searchParams)) {
    response.headers.set(NOINDEX_HEADER, NOINDEX_VALUE);
  }
  return response;
}
