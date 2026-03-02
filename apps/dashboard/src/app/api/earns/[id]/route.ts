/**
 * Earn Config API Route
 *
 * GET /api/earns/[id] - Get an Earn configuration (public, no auth)
 *
 * This route is public and does not require authentication.
 * It's used by the Earn demo app to fetch configurations for rendering.
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, createErrorResponse } from "@/lib/api-response";
import { getEarnConfigPublic } from "@/lib/actions/earns";

export const OPTIONS = corsOptions;

type EarnParams = Promise<{ id: string }>;

/**
 * GET /api/earns/[id]
 * Get an Earn configuration by ID (public, no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: EarnParams }
) {
  try {
    const { id } = await params;

    const config = await getEarnConfigPublic(id);

    if (!config) {
      return createErrorResponse("Earn config not found", 404, "NOT_FOUND");
    }

    // Return config without ownerId for security
    const { ownerId, ...result } = config;
    return createResponse(result);
  } catch (error) {
    console.error("[earns/get]", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return createErrorResponse(message, 500);
  }
}
