/**
 * Dynamic JWT Verification
 *
 * Verifies JWT tokens from Dynamic using JWKS.
 * Used for server-side validation of KYC and user API requests.
 *
 * @see https://docs.dynamic.xyz/authentication-methods/how-to-validate-users-on-the-backend
 */

import jwt, { type JwtPayload } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

function getJwksUrl(): string {
  const envId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  if (!envId) {
    throw new Error(
      "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required for authentication",
    );
  }
  return `https://app.dynamic.xyz/api/v0/sdk/${envId}/.well-known/jwks`;
}

/**
 * JWT payload from Dynamic. Uses `sub` (subject) as the user identifier.
 */
export interface DynamicJwtPayload extends JwtPayload {
  sub: string;
  userId?: string;
  email?: string;
}

let _jwksClient: JwksClient | null = null;

function getJwksClient(): JwksClient {
  if (!_jwksClient) {
    _jwksClient = new JwksClient({
      jwksUri: getJwksUrl(),
      rateLimit: true,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000,
    });
  }
  return _jwksClient;
}

/**
 * Verifies a Dynamic JWT and returns the payload.
 */
export async function verifyDynamicJWT(
  token: string,
): Promise<DynamicJwtPayload | null> {
  try {
    const jwksClient = getJwksClient();
    const signingKey = await jwksClient.getSigningKey();
    const publicKey = signingKey.getPublicKey();

    const decoded = jwt.verify(token, publicKey, {
      ignoreExpiration: false,
    }) as DynamicJwtPayload;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get JWT from request (Authorization header or cookie).
 */
export async function getJWTFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf("=");
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex);
          const value = trimmed.substring(equalIndex + 1);
          acc[key] = decodeURIComponent(value);
        }
        return acc;
      },
      {} as Record<string, string>,
    );
    return cookies["dynamic_jwt"] ?? null;
  }

  return null;
}

/**
 * Get authenticated user from request.
 */
export async function getAuthenticatedUser(
  request: Request,
): Promise<DynamicJwtPayload | null> {
  const token = await getJWTFromRequest(request);
  if (!token) return null;
  return verifyDynamicJWT(token);
}

/**
 * Get JWT from Next.js cookies (for server components).
 */
export function getJWTFromCookies(
  cookies: { get: (name: string) => { value: string } | undefined },
): string | null {
  return cookies.get("dynamic_jwt")?.value ?? null;
}

/**
 * Get authenticated user from Next.js cookies.
 * Use in server components with cookies() from next/headers.
 */
export async function getAuthenticatedUserFromCookies(
  cookies: { get: (name: string) => { value: string } | undefined },
): Promise<DynamicJwtPayload | null> {
  const token = getJWTFromCookies(cookies);
  if (!token) return null;
  return verifyDynamicJWT(token);
}
