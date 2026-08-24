/**
 * [Dev utility] The public half of the demo JWT provider's key.
 *
 * Dynamic fetches this to verify tokens minted by `/api/dev/jwt`, so an
 * environment's JWKS URL points here and never has to change again - one
 * config for every demo. Wildcard CORS and a public cache: it is a public key,
 * and Dynamic reads it from its own servers.
 *
 * GET /api/dev/jwks
 *
 * @see https://www.dynamic.xyz/docs/javascript/external-auth/third-party-auth-setup
 */

import { NextResponse } from "next/server";

import { readDevJwtProvider } from "@/lib/dev-jwt/provider";

export async function GET() {
  const provider = readDevJwtProvider();

  if (!provider) {
    return NextResponse.json(
      { error: "JWT provider is not configured on this deployment." },
      { status: 501 },
    );
  }

  return NextResponse.json(
    { keys: [provider.publicJwk] },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
