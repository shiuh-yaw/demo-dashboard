/**
 * CORS Utilities
 *
 * Shared utilities for handling CORS in API routes.
 */

import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-dynamic-environment-id",
  "Access-Control-Max-Age": "86400",
};

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflightRequest(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Create an OPTIONS handler for API routes
 */
export async function OPTIONS(): Promise<NextResponse> {
  return handleCorsPreflightRequest();
}
