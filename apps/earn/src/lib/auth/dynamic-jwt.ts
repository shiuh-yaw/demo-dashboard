/**
 * Dynamic JWT Verification
 *
 * Verifies JWT tokens from Dynamic using JWKS (JSON Web Key Set).
 * This allows server-side validation of authentication tokens.
 *
 * @see https://docs.dynamic.xyz/authentication-methods/how-to-validate-users-on-the-backend
 */

import jwt, { type JwtPayload, TokenExpiredError } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import type { NextRequest } from "next/server";
import { env } from "@/env";

const DYNAMIC_ENV_ID = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

function getJwksUrl(): string {
  if (!DYNAMIC_ENV_ID) {
    throw new Error(
      "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required for authentication"
    );
  }
  return `https://app.dynamic.xyz/api/v0/sdk/${DYNAMIC_ENV_ID}/.well-known/jwks`;
}

/**
 * JWT payload from Dynamic
 * Uses `sub` (subject) as the user identifier
 */
export interface DynamicJwtPayload extends JwtPayload {
  /** Dynamic user ID (from JWT 'sub' claim) */
  sub: string;
  /** Dynamic user ID (alternative field) */
  userId?: string;
  /** The user's email, if available */
  email?: string;
}

/**
 * Lazily initialized JWKS client
 */
let _jwksClient: JwksClient | null = null;

function getJwksClient(): JwksClient {
  if (!_jwksClient) {
    _jwksClient = new JwksClient({
      jwksUri: getJwksUrl(),
      rateLimit: true,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });
  }
  return _jwksClient;
}

/**
 * Verifies a JWT from Dynamic.
 *
 * This function fetches the appropriate public key from Dynamic's JWKS endpoint
 * and uses it to verify the token's signature.
 *
 * @param token - The JWT to verify
 * @returns The decoded payload if the token is valid, or null if verification fails
 * @throws {TokenExpiredError} If the token is expired (caller should clear cookie)
 */
export async function verifyDynamicJWT(
  token: string
): Promise<DynamicJwtPayload | null> {
  try {
    const jwksClient = getJwksClient();
    const signingKey = await jwksClient.getSigningKey();
    const publicKey = signingKey.getPublicKey();

    const decoded = jwt.verify(token, publicKey, {
      ignoreExpiration: false,
    });

    // jwt.verify can return string | JwtPayload, ensure it's an object
    if (typeof decoded === "string") {
      return null;
    }

    const payload = decoded as DynamicJwtPayload;
    return payload;
  } catch (error) {
    // Re-throw expired errors so caller can handle them
    if (error instanceof TokenExpiredError) {
      throw error;
    }

    // Don't log expected errors like invalid signature (stale cookie from different env)
    // These will be replaced when user logs in again
    return null;
  }
}

/**
 * Get JWT token from request (checks cookie)
 *
 * @param request - Next.js request object
 * @returns The JWT token or null if not found
 */
export async function getJWTFromRequest(
  request: Request | NextRequest
): Promise<string | null> {
  // Check cookie (for browser requests)
  let cookieValue: string | null = null;

  // Type guard to check if it's a NextRequest
  if (
    "cookies" in request &&
    typeof request.cookies === "object" &&
    request.cookies !== null
  ) {
    // NextRequest has cookies() method
    const cookies = request.cookies as NextRequest["cookies"];
    cookieValue = cookies.get("dynamic_jwt")?.value || null;
  } else {
    // Standard Request - parse cookie header
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf("=");
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex);
          const value = trimmed.substring(equalIndex + 1);
          acc[key] = decodeURIComponent(value);
        }
        return acc;
      }, {} as Record<string, string>);

      cookieValue = cookies["dynamic_jwt"] || null;
    }
  }

  return cookieValue;
}

/**
 * Get authenticated user from request
 *
 * @param request - Next.js request object
 * @returns The authenticated user or null if not authenticated
 */
export async function getAuthenticatedUser(
  request: Request | NextRequest
): Promise<DynamicJwtPayload | null> {
  const token = await getJWTFromRequest(request);
  if (!token) return null;

  return verifyDynamicJWT(token);
}

// Re-export TokenExpiredError for consumers
export { TokenExpiredError };
