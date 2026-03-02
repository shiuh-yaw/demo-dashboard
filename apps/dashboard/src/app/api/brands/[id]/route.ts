/**
 * Brand Profile API Route
 *
 * GET /api/brands/[id] - Get a brand profile (public, no auth)
 *
 * This route is public and does not require authentication.
 * It's used by demo apps to fetch brand profiles for rendering.
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, createErrorResponse } from "@/lib/api-response";
import { getBrandProfilePublic } from "@/lib/actions/brands";

export const OPTIONS = corsOptions;

type BrandParams = Promise<{ id: string }>;

/**
 * GET /api/brands/[id]
 * Get a brand profile by ID (public, no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: BrandParams }
) {
  try {
    const { id } = await params;

    const profile = await getBrandProfilePublic(id);

    if (!profile) {
      return createErrorResponse("Brand profile not found", 404, "NOT_FOUND");
    }

    // Return profile without ownerId for security
    const { ownerId, ...result } = profile;
    return createResponse(result);
  } catch (error) {
    console.error("[brands/get]", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return createErrorResponse(message, 500);
  }
}
