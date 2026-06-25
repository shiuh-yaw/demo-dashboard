/**
 * Iron Finance Sandbox Autoramp API Route
 *
 * PUT /api/iron/sandbox/autoramp/[id] — Approve or set the status of an
 * autoramp so an offramp progresses to settled. SANDBOX ONLY.
 *
 * Body: { status?: AutorampSandboxStatus }. Omit `status` to approve
 * (shorthand for status "Approved").
 *
 * See packages/iron/docs/iron-sandbox-testing.md.
 */

import { NextRequest } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { getIronClient } from "@/lib/iron/client";
import { z } from "zod";

type AutorampParams = Promise<{ id: string }>;

const setStatusSchema = z.object({
  status: z
    .enum([
      "Created",
      "EditPending",
      "Authorized",
      "DepositAccountAdded",
      "Approved",
      "Rejected",
      "Cancelled",
    ])
    .optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: AutorampParams },
) {
  try {
    const client = getIronClient();
    if (!client.isSandbox()) {
      return createResponse(
        { error: "This endpoint is only available in sandbox mode" },
        403,
      );
    }

    const { id: autorampId } = await params;
    const body = await req.json().catch(() => ({}));
    const { status } = setStatusSchema.parse(body ?? {});

    if (status) {
      await client.sandbox.setAutorampStatus(autorampId, status);
    } else {
      await client.sandbox.approveAutoramp(autorampId);
    }

    return createResponse({ id: autorampId, status: status ?? "Approved" }, 200);
  } catch (error) {
    return handleApiError(error, "iron/sandbox/autoramp/update");
  }
}
