/**
 * Visa Direct Config API Route
 *
 * GET /api/visa-direct/configs/[id] - Get a Visa Direct configuration (public, no auth)
 *
 * This route is public and does not require authentication.
 * It's used by the Visa Direct demo app to fetch configurations for rendering.
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, createErrorResponse } from "@/lib/api-response";
import { getVisaDirectConfigPublic } from "@/lib/actions/visa-direct";

export const OPTIONS = corsOptions;

type VisaDirectParams = Promise<{ id: string }>;

/**
 * GET /api/visa-direct/configs/[id]
 * Get a Visa Direct configuration by ID (public, no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: VisaDirectParams }
) {
  try {
    const { id } = await params;

    const config = await getVisaDirectConfigPublic(id);

    if (!config) {
      return createErrorResponse(
        "Visa Direct config not found",
        404,
        "NOT_FOUND"
      );
    }

    const { ownerId, ...result } = config;
    return createResponse(result);
  } catch (error) {
    console.error("[visa-direct/configs/get]", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return createErrorResponse(message, 500);
  }
}
