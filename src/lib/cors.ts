/**
 * CORS Utilities
 *
 * Shared utilities for handling CORS in API routes.
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-dynamic-environment-id",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

/**
 * Get CORS headers with the appropriate origin
 */
function getCorsHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = { ...CORS_HEADERS };

  // Allow the origin if it's in the allowed list
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (ALLOWED_ORIGINS.length > 0) {
    // Fallback to first allowed origin
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS[0];
  }

  return headers;
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflightRequest(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(
  response: NextResponse,
  request?: NextRequest
): NextResponse {
  const origin = request?.headers.get("origin");
  Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Create an OPTIONS handler for API routes
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return handleCorsPreflightRequest(request);
}
