/**
 * Checkout Config API Route
 *
 * GET /api/checkouts/[id] - Get a checkout configuration (public, no auth)
 *
 * This route is public and does not require authentication.
 * It's used by checkout widgets to fetch configurations for rendering.
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleGetCheckout } from "../handlers/get-checkout";
import type { CheckoutParams } from "./types";

export const OPTIONS = corsOptions;

/**
 * GET /api/checkouts/[id]
 * Get a checkout configuration by ID (public, no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: CheckoutParams }
) {
  try {
    const { id } = await params;

    const result = await handleGetCheckout({ checkoutId: id });
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "checkouts/get");
  }
}
