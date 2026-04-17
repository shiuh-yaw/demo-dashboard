import { createOfframpOrder } from "@/lib/fireblocks-orders";
import { NextResponse } from "next/server";

interface OfframpRequestBody {
  disbursementId: string;
  amountUSDC: number;
  beneficiary: {
    accountName: string;
    bank: string;
    clabe: string;
    accountNumber: string;
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OfframpRequestBody;
    const { amountUSDC, beneficiary } = body;

    if (!amountUSDC || !beneficiary) {
      return NextResponse.json(
        { error: "Missing required fields: amountUSDC, beneficiary" },
        { status: 400 },
      );
    }

    const result = await createOfframpOrder({ amountUSDC, beneficiary });

    return NextResponse.json({
      orderId: result.orderId,
      depositAddress: result.depositAddress,
      blockchain: result.blockchain,
      rate: result.rate,
      expiresAt: result.expiresAt,
      stub: result.stub,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Off-ramp order failed";
    console.error("[offramp] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
