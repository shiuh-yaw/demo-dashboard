/**
 * Iron Finance Cancel Onramp API Route
 *
 * POST /api/iron/onramps/[id]/cancel - Cancel an onramp
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient } from "@/lib/services/iron";

export const OPTIONS = corsOptions;

type OnrampParams = Promise<{ id: string }>;

/**
 * POST /api/iron/onramps/[id]/cancel
 * Cancel an onramp transaction
 */
export const POST = withAuth(
  async (_req: NextRequest, { params }: { params: OnrampParams }) => {
    try {
      const { id } = await params;
      const onramp = await ironClient.cancelOnramp(id);
      return createResponse(onramp);
    } catch (error) {
      return handleApiError(error, "iron/onramps/cancel");
    }
  }
);
