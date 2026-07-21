/**
 * `GET /api/share/context?token=` - public tracker context (Phase GTM-05).
 *
 * Public, CORS-allowlisted (`TRACK_CORS_ORIGINS`). Never leaks more than
 * `prospectName` + a book-a-call `cta` - see `lib/share-links/context.ts`.
 * Never errors to the client: invalid/inactive tokens and missing tokens
 * both resolve to 200 `{}`.
 */

import { NextRequest, NextResponse } from "next/server";

import { resolveShareContext } from "@/lib/share-links/context";
import { trackCorsHeaders, trackCorsOptions } from "@/lib/track-cors";

export const OPTIONS = trackCorsOptions;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  const body = token ? await resolveShareContext(token) : {};
  const cors = trackCorsHeaders(request.headers.get("origin"));

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      ...(cors ?? {}),
    },
  });
}
