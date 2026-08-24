/**
 * The demo-only JWT provider every demo app signs external-auth tokens with.
 *
 * It lives in the dashboard rather than in each app because a Dynamic
 * environment holds ONE third-party-auth config - one issuer, one JWKS URL -
 * so the demos sharing an environment must sign with the same key. Serving it
 * from here means the key exists in exactly one place, a demo needs no key
 * material of its own, and adding a demo needs no change to the environment's
 * configuration.
 *
 * It also removes the tunnel from local development: Dynamic has to FETCH the
 * JWKS to verify a token, which a demo on localhost cannot offer, but the
 * deployed dashboard can.
 *
 * Stands in for the identity provider a prospect already runs. Not part of the
 * Dynamic integration - a real deployment has neither of these endpoints.
 *
 * @see https://www.dynamic.xyz/docs/javascript/external-auth/third-party-auth-setup
 */

import { importJWK, SignJWT, type JWK } from "jose";

import { env } from "@/env";

export interface DevJwtProvider {
  kid: string;
  issuer: string;
  publicJwk: JWK;
  privateJwk: JWK;
}

/** Null when the provider isn't configured - the caller answers 501, not 500. */
export function readDevJwtProvider(): DevJwtProvider | null {
  const { JWT_PROVIDER_KID, JWT_PROVIDER_ISSUER } = env;
  const publicKeyJson = env.JWT_PROVIDER_PUBLIC_KEY;
  const privateKeyJson = env.JWT_PROVIDER_PRIVATE_KEY;

  if (
    !JWT_PROVIDER_KID ||
    !JWT_PROVIDER_ISSUER ||
    !publicKeyJson ||
    !privateKeyJson
  ) {
    return null;
  }

  try {
    return {
      kid: JWT_PROVIDER_KID,
      issuer: JWT_PROVIDER_ISSUER,
      publicJwk: JSON.parse(publicKeyJson) as JWK,
      privateJwk: JSON.parse(privateKeyJson) as JWK,
    };
  } catch {
    return null;
  }
}

/**
 * Signs a token for `sub`.
 *
 * Any subject is accepted on purpose: the demo's whole point is showing that a
 * user your own system vouched for gets a Dynamic session, and inventing one
 * is how a prospect tries it.
 */
export async function signDevJwt({
  provider,
  sub,
  email,
}: {
  provider: DevJwtProvider;
  sub: string;
  email?: string;
}): Promise<string> {
  const privateKey = await importJWK(provider.privateJwk, "RS256");

  return new SignJWT({ ...(email ? { email, emailVerified: true } : {}) })
    .setProtectedHeader({ alg: "RS256", kid: provider.kid })
    .setIssuer(provider.issuer)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}
