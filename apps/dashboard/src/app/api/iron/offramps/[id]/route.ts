/**
 * Iron Finance Offramp by ID API Route
 *
 * GET /api/iron/offramps/[id] - Get offramp by ID
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getIronClient } from "@/lib/iron/client";

export const OPTIONS = corsOptions;

type OfframpParams = Promise<{ id: string }>;

/**
 * GET /api/iron/offramps/[id]
 * Get an offramp by ID
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: OfframpParams }) => {
    try {
      const { id } = await params;
      const offramp = await getIronClient().offramp.get(id);
      return createResponse(offramp, 200);
    } catch (error) {
      return handleApiError(error, "iron/offramps/get");
    }
  }
);
