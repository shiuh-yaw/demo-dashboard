/**
 * Iron Finance Sandbox Identification API Route
 *
 * POST /api/iron/sandbox/identification/[id] - Update identification status
 *
 * SANDBOX ONLY: Use this to approve or reject identifications for testing.
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { getIronClient } from "@/lib/iron/client";
import { z } from "zod";

type IdentificationParams = Promise<{ id: string }>;

const updateStatusSchema = z.object({
  approved: z.boolean(),
});

/**
 * POST /api/iron/sandbox/identification/[id]
 * Update identification status (sandbox only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: IdentificationParams }
) {
  try {
    const client = getIronClient();

    // Check if we're in sandbox mode
    if (!client.isSandbox()) {
      return createResponse(
        { error: "This endpoint is only available in sandbox mode" },
        403
      );
    }

    const { id: identificationId } = await params;
    const body = await req.json();

    // Validate request body
    const validated = updateStatusSchema.parse(body);

    const identification = await client.identifications.updateStatus(
      identificationId,
      validated.approved
    );

    return createResponse(identification, 200);
  } catch (error) {
    return handleApiError(error, "iron/sandbox/identification/update");
  }
}
