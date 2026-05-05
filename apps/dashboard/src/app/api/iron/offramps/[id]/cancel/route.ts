/**
 * Iron Finance Cancel Offramp API Route
 *
 * POST /api/iron/offramps/[id]/cancel - Cancel an offramp
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient } from "@dynamic-demos/iron";

export const OPTIONS = corsOptions;

type OfframpParams = Promise<{ id: string }>;

/**
 * POST /api/iron/offramps/[id]/cancel
 * Cancel an offramp transaction
 */
export const POST = withAuth(
  async (_req: NextRequest, { params }: { params: OfframpParams }) => {
    try {
      const { id } = await params;
      const offramp = await ironClient.cancelOfframp(id);
      return createResponse(offramp);
    } catch (error) {
      return handleApiError(error, "iron/offramps/cancel");
    }
  }
);
