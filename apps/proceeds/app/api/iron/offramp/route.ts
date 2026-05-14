import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getOfframpQuote,
  createOfframp,
  chainIdToBlockchain,
} from "@dynamic-demos/iron";
import { getServerUserData } from "@/lib/auth/server-auth";
import { getSimpleOfframpConfig } from "@/lib/iron-env";

const quoteSchema = z.object({
  action: z.literal("quote"),
  amount_usdc: z.number().positive(),
  chain_id: z.number(),
});

const executeSchema = z.object({
  action: z.literal("execute"),
  quote_id: z.string().min(1),
  chain_id: z.number(),
});

const bodySchema = z.discriminatedUnion("action", [quoteSchema, executeSchema]);

export async function POST(req: NextRequest) {
  const user = await getServerUserData();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  let blockchain: ReturnType<typeof chainIdToBlockchain>;
  try {
    blockchain = chainIdToBlockchain(data.chain_id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unsupported chain" },
      { status: 400 },
    );
  }

  try {
    const config = getSimpleOfframpConfig();

    if (data.action === "quote") {
      const quote = await getOfframpQuote(
        data.amount_usdc,
        blockchain,
        config,
      );
      return NextResponse.json(quote);
    }

    const result = await createOfframp(data.quote_id, blockchain, config);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[iron/offramp] Error:", err);
    return NextResponse.json({ error: "Off-ramp failed" }, { status: 500 });
  }
}
