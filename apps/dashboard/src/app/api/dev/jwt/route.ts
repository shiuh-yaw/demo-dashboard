/**
 * [Dev utility] Mints a JWT the way a customer's own auth system would.
 *
 * Every demo calls this rather than holding a signing key: the environment's
 * one third-party-auth config names one issuer and one JWKS URL, so a demo
 * signing with its own key would produce a `kid` that JWKS does not publish.
 *
 * Any `sub` is accepted deliberately - inventing a user is how the demo is
 * driven. That is also why this belongs to a sandbox environment and not a
 * production one: a token from here becomes a Dynamic session for whoever it
 * names.
 *
 * POST /api/dev/jwt  { sub?, email? } -> { token, sub, email }
 *
 * @see https://www.dynamic.xyz/docs/javascript/external-auth/third-party-auth-usage
 */

import { NextRequest, NextResponse } from "next/server";

import { addCorsHeaders, handleCorsPreflightRequest } from "@/lib/cors";
import { readDevJwtProvider, signDevJwt } from "@/lib/dev-jwt/provider";

export async function OPTIONS() {
  return handleCorsPreflightRequest();
}

export async function POST(request: NextRequest) {
  const provider = readDevJwtProvider();

  if (!provider) {
    return addCorsHeaders(
      NextResponse.json(
        {
          error:
            "JWT provider is not configured on this deployment. Set JWT_PROVIDER_KID, JWT_PROVIDER_ISSUER, JWT_PROVIDER_PUBLIC_KEY and JWT_PROVIDER_PRIVATE_KEY.",
        },
        { status: 501 },
      ),
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    sub?: unknown;
    email?: unknown;
  };
  const sub = typeof body.sub === "string" && body.sub.trim()
    ? body.sub.trim()
    : crypto.randomUUID();
  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim()
      : undefined;

  try {
    const token = await signDevJwt({ provider, sub, email });
    return addCorsHeaders(
      NextResponse.json({ token, sub, email: email ?? null }),
    );
  } catch (error) {
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to mint a token", details: String(error) },
        { status: 500 },
      ),
    );
  }
}
