/**
 * Dynamic Authentication Utilities
 *
 * Provides JWT verification and authentication middleware for Dynamic.xyz integration.
 * Handles token extraction, verification, and request authentication.
 */

import jwt, { type JwtPayload } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { addCorsHeaders } from "@/lib/cors";

// =============================================================================
// CONSTANTS
// =============================================================================

const DYNAMIC_JWT_COOKIE_NAME = "dynamic_jwt";
const DYNAMIC_ENVIRONMENT_ID_HEADER = "x-dynamic-environment-id";
const AUTHORIZATION_HEADER = "authorization";
const BEARER_PREFIX = "Bearer ";

const JWKS_CACHE_CONFIG = {
  rateLimit: true,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
} as const;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Represents a verified credential for a user.
 */
export type JwtVerifiedCredential = {
  id: string;
  address: string;
  chain: string;
  format: string;
  wallet_name: string;
  wallet_provider: string;
};

/**
 * Represents the decoded payload of a Dynamic JWT.
 */
export interface DynamicJwtPayload extends JwtPayload {
  sub: string;
  /** The environment ID from your Dynamic project. */
  environment_id: string;
  /** An array of verified credentials for the user. */
  verified_credentials: JwtVerifiedCredential[];
  /** The user's email, if available. */
  email: string;
}

/**
 * Represents an authenticated user from a verified JWT.
 */
export type AuthenticatedUser = DynamicJwtPayload;

/**
 * Route context that may include params (for Next.js dynamic routes).
 */
type RouteContext = {
  params?: Promise<Record<string, string>>;
};

/**
 * Handler function for authenticated routes.
 */
type AuthenticatedRequestHandler<T extends RouteContext = RouteContext> = (
  req: NextRequest,
  context: { user: AuthenticatedUser } & T
) => Promise<NextResponse> | NextResponse;

// =============================================================================
// ERROR TYPES
// =============================================================================

class AuthenticationError extends Error {
  constructor(message: string, public readonly statusCode: number = 401) {
    super(message);
    this.name = "AuthenticationError";
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// =============================================================================
// JWKS CLIENT CACHE
// =============================================================================

/**
 * Cache for JWKS clients per environment ID to avoid recreating clients.
 */
const jwksClientCache = new Map<string, JwksClient>();

/**
 * Gets or creates a JWKS client for the given environment ID.
 */
function getJwksClient(environmentId: string): JwksClient {
  if (!jwksClientCache.has(environmentId)) {
    const jwksUrl = `https://app.dynamic.xyz/api/v0/sdk/${environmentId}/.well-known/jwks`;
    const client = new JwksClient({
      jwksUri: jwksUrl,
      ...JWKS_CACHE_CONFIG,
    });
    jwksClientCache.set(environmentId, client);
  }
  return jwksClientCache.get(environmentId)!;
}

// =============================================================================
// TOKEN EXTRACTION
// =============================================================================

/**
 * Extracts the JWT token from the request.
 * Tries Authorization header first, then falls back to cookie.
 *
 * @param req - The Next.js request object
 * @returns The JWT token or null if not found
 */
async function extractToken(req: NextRequest): Promise<string | null> {
  // Try Authorization header first
  const authHeader = req.headers.get(AUTHORIZATION_HEADER);
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    return authHeader.slice(BEARER_PREFIX.length).trim() || null;
  }

  // Fall back to cookie
  const cookieStore = await cookies();
  const jwtCookie = cookieStore.get(DYNAMIC_JWT_COOKIE_NAME);
  return jwtCookie?.value || null;
}

/**
 * Extracts the environment ID from the request headers.
 *
 * @param req - The Next.js request object
 * @returns The environment ID or null if not found
 */
function extractEnvironmentId(req: NextRequest): string | null {
  return req.headers.get(DYNAMIC_ENVIRONMENT_ID_HEADER);
}

// =============================================================================
// JWT VERIFICATION
// =============================================================================

/**
 * Verifies a JWT from Dynamic.
 *
 * This function fetches the appropriate public key from Dynamic's JWKS endpoint
 * and uses it to verify the token's signature.
 *
 * @param token - The JWT to verify
 * @param environmentId - The Dynamic environment ID
 * @returns The decoded payload if valid, or null if verification fails
 * @throws {AuthenticationError} If token verification fails
 * @see https://docs.dynamic.xyz/authentication-methods/how-to-validate-users-on-the-backend#option-3-do-it-yourself-verification
 */
export async function verifyDynamicJWT(
  token: string,
  environmentId: string
): Promise<DynamicJwtPayload> {
  try {
    const client = getJwksClient(environmentId);
    const signingKey = await client.getSigningKey();
    const publicKey = signingKey.getPublicKey();

    const decoded = jwt.verify(token, publicKey, {
      ignoreExpiration: false,
    }) as DynamicJwtPayload;

    return decoded;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "JWT verification failed";
    console.error("JWT verification failed:", errorMessage);
    throw new AuthenticationError("Invalid authentication token", 401);
  }
}

// =============================================================================
// ERROR RESPONSE HELPERS
// =============================================================================

/**
 * Creates an error response with CORS headers.
 */
function createErrorResponse(message: string, status: number): NextResponse {
  return addCorsHeaders(NextResponse.json({ error: message }, { status }));
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Higher-order function that wraps route handlers with authentication.
 *
 * Extracts and verifies the Dynamic JWT token from the request,
 * then passes the authenticated user to the handler.
 *
 * @param handler - The route handler to wrap
 * @returns A new handler that includes authentication
 *
 * @example
 * ```ts
 * export const GET = withAuth(async (req, { user, params }) => {
 *   const { id } = await params;
 *   return NextResponse.json({ userId: user.sub });
 * });
 * ```
 */
export function withAuth<T extends RouteContext = RouteContext>(
  handler: AuthenticatedRequestHandler<T>
) {
  return async (req: NextRequest, context?: T): Promise<NextResponse> => {
    try {
      // Extract environment ID
      const environmentId = extractEnvironmentId(req);
      if (!environmentId) {
        return createErrorResponse(
          `${DYNAMIC_ENVIRONMENT_ID_HEADER} header is required`,
          400
        );
      }

      // Extract token
      const token = await extractToken(req);
      if (!token) {
        return createErrorResponse(
          "Authentication token required. Provide Bearer token in Authorization header or dynamic_jwt cookie.",
          401
        );
      }

      // Verify token
      const user = await verifyDynamicJWT(token, environmentId);

      // Merge user with context and call handler
      const handlerContext = {
        user,
        ...context,
      } as { user: AuthenticatedUser } & T;

      const response = await handler(req, handlerContext);
      return addCorsHeaders(response);
    } catch (error) {
      // Handle known authentication errors
      if (error instanceof AuthenticationError) {
        return createErrorResponse(error.message, error.statusCode);
      }

      if (error instanceof ValidationError) {
        return createErrorResponse(error.message, 400);
      }

      // Handle unexpected errors
      console.error("Unexpected error during authentication:", error);
      return createErrorResponse("An internal server error occurred", 500);
    }
  };
}
