/**
 * Dynamic Authentication Utilities
 *
 * Provides authentication middleware for Dynamic.xyz integration.
 * Delegates to @dynamic-demos/dynamic (getAuthenticatedUser, DynamicJwtPayload).
 */

import {
  getAuthenticatedUser,
  type DynamicJwtPayload,
  type JwtVerifiedCredential,
} from "@dynamic-demos/dynamic";
import { NextRequest, NextResponse } from "next/server";
import { addCorsHeaders } from "@/lib/cors";

// Re-export for consumers
export type { DynamicJwtPayload, JwtVerifiedCredential };

// =============================================================================
// CONSTANTS
// =============================================================================

const DYNAMIC_ENVIRONMENT_ID_HEADER = "x-dynamic-environment-id";

// =============================================================================
// TYPES
// =============================================================================

/** Authenticated user from a verified JWT. */
export type AuthenticatedUser = DynamicJwtPayload;

/**
 * Route context that may include params (for Next.js dynamic routes).
 * In Next.js App Router, params is always present, even if empty.
 */
type RouteContext = {
  params: Promise<Record<string, string>>;
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

/**
 * Extracts the environment ID from the request headers.
 */
function extractEnvironmentId(req: NextRequest): string | null {
  return req.headers.get(DYNAMIC_ENVIRONMENT_ID_HEADER);
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
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    try {
      const environmentId = extractEnvironmentId(req);
      if (!environmentId) {
        return createErrorResponse(
          `${DYNAMIC_ENVIRONMENT_ID_HEADER} header is required`,
          400
        );
      }

      const user = await getAuthenticatedUser(req, environmentId);
      if (!user) {
        return createErrorResponse(
          "Authentication token required. Provide Bearer token in Authorization header or dynamic_jwt cookie.",
          401
        );
      }

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
