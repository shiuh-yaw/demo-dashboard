/**
 * Remittance Config API Route
 *
 * GET /api/remittance/[id] - Get a Remittance configuration (public, no auth)
 *
 * This route is public and does not require authentication.
 * It's used by the Remittance demo app to fetch configurations for rendering.
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, createErrorResponse } from "@/lib/api-response";
import { getRemittanceConfigPublic } from "@/lib/actions/remittance";

export const OPTIONS = corsOptions;

type RemittanceParams = Promise<{ id: string }>;

/**
 * GET /api/remittance/[id]
 * Get a Remittance configuration by ID (public, no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: RemittanceParams }
) {
  try {
    const { id } = await params;

    const config = await getRemittanceConfigPublic(id);

    if (!config) {
      return createErrorResponse(
        "Remittance config not found",
        404,
        "NOT_FOUND"
      );
    }

    // Return config without ownerId for security
    const { ownerId, ...result } = config;
    return createResponse(result);
  } catch (error) {
    console.error("[remittance/get]", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return createErrorResponse(message, 500);
  }
}
