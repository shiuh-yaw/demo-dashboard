/**
 * Standard JSON responses and route error handling (aligned with remittance app).
 */

import { NextResponse } from "next/server";
import { AppError } from "./errors";

export function createResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

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
