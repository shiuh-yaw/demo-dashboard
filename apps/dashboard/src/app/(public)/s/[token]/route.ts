/**
 * `/s/[token]` - public share-link redirect (Phase GTM-05).
 *
 * Server-only: no session calls, no Providers, lives in the `(public)` route
 * group. Never a dead link (GTM hard rule) - resolution logic (active ->
 * branded+tracked, revoked/expired-but-identifiable -> plain, unknown ->
 * `/`) lives in `lib/share-links/resolve-redirect.ts` so it's unit-testable
 * without a request/response round trip.
 */

import { NextRequest, NextResponse } from "next/server";

import { resolveShareRedirectUrl } from "@/lib/share-links/resolve-redirect";

export const dynamic = "force-dynamic";

type TokenParams = Promise<{ token: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: TokenParams },
): Promise<NextResponse> {
  const { token } = await params;
  const target = await resolveShareRedirectUrl(token);
  const destination = target.startsWith("/")
    ? new URL(target, request.nextUrl.origin)
    : target;
  return NextResponse.redirect(destination, 302);
}
