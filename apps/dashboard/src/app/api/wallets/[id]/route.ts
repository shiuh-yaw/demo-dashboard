/**
 * Wallet Config API Route
 *
 * GET /api/wallets/[id] - Get a Wallet configuration (public, no auth)
 *
 * This route is public and does not require authentication.
 * It's used by the Wallet demo app to fetch configurations for rendering.
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, createErrorResponse } from "@/lib/api-response";
import { getWalletConfigPublic } from "@/lib/actions/wallets";

export const OPTIONS = corsOptions;

type WalletParams = Promise<{ id: string }>;

/**
 * GET /api/wallets/[id]
 * Get a Wallet configuration by ID (public, no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: WalletParams }
) {
  try {
    const { id } = await params;

    const config = await getWalletConfigPublic(id);

    if (!config) {
      return createErrorResponse("Wallet config not found", 404, "NOT_FOUND");
    }

    // Return config without ownerId for security
    const { ownerId, ...result } = config;
    return createResponse(result);
  } catch (error) {
    console.error("[wallets/get]", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return createErrorResponse(message, 500);
  }
}
