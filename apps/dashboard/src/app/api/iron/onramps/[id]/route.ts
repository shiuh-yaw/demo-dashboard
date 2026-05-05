/**
 * Iron Finance Onramp by ID API Route
 *
 * GET /api/iron/onramps/[id] - Get onramp by ID
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { ironClient } from "@dynamic-demos/iron";

export const OPTIONS = corsOptions;

type OnrampParams = Promise<{ id: string }>;

/**
 * GET /api/iron/onramps/[id]
 * Get an onramp by ID
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: OnrampParams }) => {
    try {
      const { id } = await params;
      const onramp = await ironClient.getOnramp(id);
      return createResponse(onramp, 200);
    } catch (error) {
      return handleApiError(error, "iron/onramps/get");
    }
  }
);
