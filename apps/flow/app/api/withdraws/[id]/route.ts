/**
 * GET /api/withdraws/[id]      — read intent state.
 * PATCH /api/withdraws/[id]    — discriminated state transitions:
 *   { action: "simulate-transfer" }     — operator bypass when no live FB
 *   { action: "flow-submitted", flowTransactionId } — client records tx id
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  getWithdrawIntent,
  markFlowSubmitted,
  markTransferConfirmed,
} from "@/lib/withdraw/store";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("simulate-transfer"),
    fbTransferTxHash: z.string().optional(),
  }),
  z.object({
    action: z.literal("flow-submitted"),
    flowTransactionId: z.string().min(1),
  }),
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const record = getWithdrawIntent(id);
  if (!record) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(record);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const parsed = patchSchema.parse(json);

    if (parsed.action === "simulate-transfer") {
      const hash = parsed.fbTransferTxHash ?? `simulated:${id}:${Date.now()}`;
      const result = markTransferConfirmed(id, hash);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    const result = markFlowSubmitted(id, parsed.flowTransactionId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation failed", details: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[PATCH /api/withdraws/[id]] failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
