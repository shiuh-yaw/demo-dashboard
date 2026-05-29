/**
 * POST /api/withdraws — local Withdraw intent persistence.
 *
 * Standalone — no dashboard hop. In-memory store (see
 * lib/withdraw/store.ts). Phase-10-polish ECDSA verification of the
 * EIP-712 signature lives here when it lands.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createWithdrawIntent } from "@/lib/withdraw/store";

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX_SIGNATURE = /^0x[0-9a-fA-F]{130}$/;
const UINT_STRING = /^[0-9]+$/;

const createSchema = z.object({
  configId: z.string().min(1),
  userId: z.string().min(1),
  embeddedWalletAddress: z.string().regex(HEX_ADDRESS),
  destinationChain: z.string().min(1),
  destinationAsset: z.string().min(1),
  destinationAddress: z.string().min(1),
  amount: z.string().regex(UINT_STRING),
  signature: z.string().regex(HEX_SIGNATURE),
  // `typedData` is freeform JSON (the EIP-712 payload we audit-store).
  // Force a value so the store's CreateWithdrawIntentInput type — which
  // declares `typedData: unknown` as required — gets satisfied.
  typedData: z.unknown().refine((v) => v !== undefined, {
    message: "typedData is required",
  }),
  ttlSeconds: z.number().int().positive().max(60 * 60 * 24).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = createSchema.parse(json);
    const record = createWithdrawIntent(parsed);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation failed", details: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/withdraws] failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
