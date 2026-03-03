/**
 * API Response Utilities
 *
 * Standardized response handling for API routes.
 * Provides consistent error handling and response formatting.
 */

import { NextResponse } from "next/server";
import { AppError } from "./errors";

/**
 * Create a successful JSON response
 */
export function createResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Create an error response
 */
export function createErrorResponse(
  message: string,
  status = 500,
  code?: string,
): NextResponse {
  return NextResponse.json(
    { error: message, ...(code && { code }) },
    { status },
  );
}

/**
 * Handle errors and return appropriate response
 * Maps AppError subclasses to appropriate HTTP responses
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  if (context) console.error(`[${context}]`, error);
  else console.error(error);

  if (error instanceof AppError) {
    return createErrorResponse(error.message, error.statusCode, error.code);
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return createErrorResponse(message, 500);
}

/**
 * Wrapper for route handlers that provides consistent error handling
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
