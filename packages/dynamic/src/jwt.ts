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

function getJwksUrl(environmentId: string): string {
  return `https://app.dynamic.xyz/api/v0/sdk/${environmentId}/.well-known/jwks`;
}

/**
 * Verified credential from Dynamic JWT (wallet, etc.).
 */
export interface JwtVerifiedCredential {
  id: string;
  address: string;
  chain: string;
  format: string;
  wallet_name: string;
  wallet_provider: string;
}

/**
 * JWT payload from Dynamic. Uses `sub` (subject) as the user identifier.
 */
export interface DynamicJwtPayload extends JwtPayload {
  sub: string;
  userId?: string;
  email?: string;
  /** The environment ID from your Dynamic project. */
  environment_id?: string;
  /** Verified credentials (wallets, etc.). */
  verified_credentials?: JwtVerifiedCredential[];
}

/** Extract user ID from JWT payload (sub or userId). */
export function getUserIdFromPayload(
  payload: DynamicJwtPayload | null,
): string | null {
  if (!payload) return null;
  return payload.sub ?? payload.userId ?? null;
}

let _defaultJwksClient: JwksClient | null = null;
const _jwksClientCache = new Map<string, JwksClient>();

function getJwksClient(environmentId?: string): JwksClient {
  const envId = environmentId ?? process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  if (!envId) {
    throw new Error(
      "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID or environmentId is required for authentication",
    );
  }

  if (environmentId) {
    if (!_jwksClientCache.has(envId)) {
      _jwksClientCache.set(
        envId,
        new JwksClient({
          jwksUri: getJwksUrl(envId),
          rateLimit: true,
          cache: true,
          cacheMaxEntries: 5,
          cacheMaxAge: 600000,
        }),
      );
    }
    return _jwksClientCache.get(envId)!;
  }

  if (!_defaultJwksClient) {
    _defaultJwksClient = new JwksClient({
      jwksUri: getJwksUrl(envId),
      rateLimit: true,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000,
    });
  }
  return _defaultJwksClient;
}

/**
 * Verifies a Dynamic JWT and returns the payload.
 *
 * @param token - The JWT to verify
 * @param environmentId - Optional. When provided, uses this env for JWKS (multi-tenant).
 *   When omitted, uses NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID.
 */
export async function verifyDynamicJWT(
  token: string,
  environmentId?: string,
): Promise<DynamicJwtPayload | null> {
  try {
    const jwksClient = getJwksClient(environmentId);
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
export async function getJWTFromRequest(
  request: Request,
): Promise<string | null> {
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
 *
 * @param request - The request (Authorization header or cookie)
 * @param environmentId - Optional. For multi-tenant; uses this env for JWKS.
 *   When omitted, uses NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID.
 */
export async function getAuthenticatedUser(
  request: Request,
  environmentId?: string,
): Promise<DynamicJwtPayload | null> {
  const token = await getJWTFromRequest(request);
  if (!token) return null;
  return verifyDynamicJWT(token, environmentId);
}

/**
 * Get JWT from Next.js cookies (for server components).
 */
export function getJWTFromCookies(cookies: {
  get: (name: string) => { value: string } | undefined;
}): string | null {
  return cookies.get("dynamic_jwt")?.value ?? null;
}

/**
 * Get authenticated user from Next.js cookies.
 * Use in server components with cookies() from next/headers.
 */
export async function getAuthenticatedUserFromCookies(cookies: {
  get: (name: string) => { value: string } | undefined;
}): Promise<DynamicJwtPayload | null> {
  const token = getJWTFromCookies(cookies);
  if (!token) return null;
  return verifyDynamicJWT(token);
}
