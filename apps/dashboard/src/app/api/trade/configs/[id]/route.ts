/**
 * Trade Config API Route
 *
 * GET /api/trade/configs/[id] - Get a Trade configuration (public, no auth)
 *
 * This route is public and does not require authentication.
 * It's used by the Trade demo app to fetch configurations for rendering.
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, createErrorResponse } from "@/lib/api-response";
import { getTradeConfigPublic } from "@/lib/actions/trade";

export const OPTIONS = corsOptions;

type TradeParams = Promise<{ id: string }>;

/**
 * GET /api/trade/configs/[id]
 * Get a Trade configuration by ID (public, no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: TradeParams }
) {
  try {
    const { id } = await params;

    const config = await getTradeConfigPublic(id);

    if (!config) {
      return createErrorResponse(
        "Trade config not found",
        404,
        "NOT_FOUND"
      );
    }

    // Return config without ownerId for security
    const { ownerId, ...result } = config;
    return createResponse(result);
  } catch (error) {
    console.error("[trade/configs/get]", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return createErrorResponse(message, 500);
  }
}
