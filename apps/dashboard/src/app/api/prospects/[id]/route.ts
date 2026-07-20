/**
 * Prospect Profile API Route
 *
 * GET /api/prospects/[id] - Get a prospect profile (public, no auth)
 *
 * This route is public and does not require authentication.
 * It's used by demo apps to fetch prospect profiles for rendering.
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, createErrorResponse } from "@/lib/api-response";
import { getProspectProfilePublic } from "@/lib/actions/prospects";

export const OPTIONS = corsOptions;

type ProspectParams = Promise<{ id: string }>;

/**
 * GET /api/prospects/[id]
 * Get a prospect profile by ID (public, no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: ProspectParams }
) {
  try {
    const { id } = await params;

    const profile = await getProspectProfilePublic(id);

    if (!profile) {
      return createErrorResponse("Prospect profile not found", 404, "NOT_FOUND");
    }

    // Return profile without ownerId for security
    const { ownerId, ...result } = profile;
    return createResponse(result);
  } catch (error) {
    console.error("[prospects/get]", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return createErrorResponse(message, 500);
  }
}
