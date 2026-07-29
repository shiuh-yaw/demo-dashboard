/**
 * API Response Utilities
 *
 * Standardized response handling for API routes.
 * Provides consistent error handling and response formatting.
 */

import { NextResponse } from "next/server";
import { RainApiError } from "@dynamic-demos/rain";
import { addCorsHeaders } from "./cors";
import { AppError } from "./errors";
import { ZodError, formatZodError, getFieldErrors } from "./validation";

/**
 * Create a successful JSON response with CORS headers
 *
 * Standardizes all API responses to { success: true, data: T } format.
 * CORS headers are automatically added for cross-origin support.
 */
export function createResponse<T>(data: T, status: number = 200): NextResponse {
  return addCorsHeaders(NextResponse.json({ success: true, data }, { status }));
}

/**
 * Create an error response with CORS headers
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
): NextResponse {
  return addCorsHeaders(
    NextResponse.json({ error: message, ...(code && { code }) }, { status }),
  );
}

/**
 * Handle errors and return appropriate response
 * Maps AppError subclasses and ZodError to appropriate HTTP responses
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  // Log error with context
  if (context) console.error(`[${context}]`, error);
  else console.error(error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return addCorsHeaders(
      NextResponse.json(
        {
          error: formatZodError(error),
          code: "VALIDATION_ERROR",
          details: getFieldErrors(error),
        },
        { status: 400 },
      ),
    );
  }

  // Handle known application errors
  if (error instanceof AppError) {
    return createErrorResponse(error.message, error.statusCode, error.code);
  }

  // Handle Rain API errors - surface Rain's real status code, not a generic 500
  if (error instanceof RainApiError) {
    return createErrorResponse(error.message, error.status, "RAIN_ERROR");
  }

  // Handle unknown errors
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return createErrorResponse(message, 500, undefined);
}

/**
 * Wrapper for route handlers that provides consistent error handling
 *
 * @example
 * export const GET = withAuth(
 *   withApiHandler("checkouts/stats", async (request) => {
 *     const result = await handleGetStats({ checkoutId });
 *     return createResponse({ stats: result });
 *   })
 * );
 */
export function withApiHandler(
  context: string,
  handler: (request: Request) => Promise<NextResponse>,
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}
