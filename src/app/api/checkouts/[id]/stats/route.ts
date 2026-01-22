/**
 * Checkout Stats API
 *
 * GET /api/checkouts/[id]/stats - Get aggregated statistics for a checkout
 */

import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleGetStats } from "../../handlers/get-stats";
import type { CheckoutParams } from "../types";

export const OPTIONS = corsOptions;

export const GET = withAuth(
  async (_request, { params }: { params: CheckoutParams }) => {
    try {
      const { id: checkoutId } = await params;

      const result = await handleGetStats({ checkoutId });
      return createResponse(result);
    } catch (error) {
      return handleApiError(error, "checkouts/stats");
    }
  }
);
