/**
 * Iron Finance Third Party Payment by ID API Route
 *
 * GET /api/iron/third-party-payments/[id] - Get payment by ID
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getIronClient } from "@/lib/iron/client";

export const OPTIONS = corsOptions;

type PaymentParams = Promise<{ id: string }>;

/**
 * GET /api/iron/third-party-payments/[id]
 * Get a third-party payment by ID
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: PaymentParams }) => {
    try {
      const { id } = await params;
      const payment = await getIronClient().thirdPartyPayments.get(id);
      return createResponse(payment, 200);
    } catch (error) {
      return handleApiError(error, "iron/third-party-payments/get");
    }
  }
);
