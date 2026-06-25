/**
 * Iron Finance Sandbox Transaction API Route
 *
 * POST /api/iron/sandbox/transaction — Simulate an on-chain deposit for an
 * autoramp. SANDBOX ONLY: the deposit address Iron returns is not monitored
 * on-chain in sandbox, so this is how you "send" the crypto for testing.
 *
 * See packages/iron/docs/iron-sandbox-testing.md.
 */

import { NextRequest } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { getIronClient } from "@/lib/iron/client";
import { z } from "zod";

const createTransactionSchema = z.object({
  autoramp_id: z.string().min(1, "autoramp_id is required"),
  amount: z.string().min(1, "amount is required"),
  amount_out: z.string().optional(),
  fee: z.string().optional(),
  fx_rate: z.string().optional(),
  initial_state: z.enum(["Pending", "Completed", "Failed"]).optional(),
  input_currency: z
    .union([
      z.object({ type: z.literal("Fiat"), code: z.string() }),
      z.object({
        type: z.literal("Crypto"),
        blockchain: z.string(),
        token: z.string(),
      }),
    ])
    .optional(),
  transaction_id: z.string().optional(),
  deposit_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const client = getIronClient();
    if (!client.isSandbox()) {
      return createResponse(
        { error: "This endpoint is only available in sandbox mode" },
        403,
      );
    }

    const body = await req.json();
    const validated = createTransactionSchema.parse(body);

    const tx = await client.sandbox.createTransaction(validated);
    return createResponse(tx, 201);
  } catch (error) {
    return handleApiError(error, "iron/sandbox/transaction/create");
  }
}
