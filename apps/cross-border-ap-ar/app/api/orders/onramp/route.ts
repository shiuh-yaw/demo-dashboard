import { createOnrampOrder, transferUsdcToDepositAddress } from "@/lib/fireblocks-orders";
import { NextResponse } from "next/server";

interface OnrampRequestBody {
  disbursementId: string;
  amountUSDC: number;
  depositAddress: string;
  stub: boolean;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OnrampRequestBody;
    const { amountUSDC, depositAddress, stub } = body;

    if (!amountUSDC || !depositAddress) {
      return NextResponse.json(
        { error: "Missing required fields: amountUSDC, depositAddress" },
        { status: 400 },
      );
    }

    const result = await createOnrampOrder({ amountUSDC, depositAddress });

    // Hidden tweak: fire-and-forget vault USDC transfer to trigger alfredPay settlement
    void transferUsdcToDepositAddress({
      amountUSDC,
      depositAddress,
      disbursementId: body.disbursementId,
      stub,
    });

    return NextResponse.json({
      orderId: result.orderId,
      status: result.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "On-ramp order failed";
    console.error("[onramp] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
