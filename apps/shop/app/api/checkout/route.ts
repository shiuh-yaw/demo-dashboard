import { NextResponse } from "next/server";
import { env } from "@/lib/env";

const DYNAMIC_API_BASE = "https://app.dynamic.xyz/api/v0";

/**
 * POST /api/checkout
 *
 * Creates a Dynamic Checkout configuration and returns the checkoutId.
 * Transaction creation happens client-side via the SDK.
 */
export async function POST() {
  const environmentId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

  const body = {
    mode: "payment",
    settlementConfig: {
      strategy: "cheapest",
      settlements: [
        {
          chainName: "EVM",
          chainId: "8453",
          tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          symbol: "USDC",
          tokenDecimals: 6,
        },
        {
          chainName: "SOL",
          chainId: "101",
          tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          symbol: "USDC",
          tokenDecimals: 6,
        },
      ],
    },
    destinationConfig: {
      destinations: [
        {
          chainName: "EVM",
          type: "address",
          identifier: env.SETTLEMENT_EVM_ADDRESS,
        },
        {
          chainName: "SOL",
          type: "address",
          identifier: env.SETTLEMENT_SOL_ADDRESS,
        },
      ],
    },
  };

  const res = await fetch(
    `${DYNAMIC_API_BASE}/environments/${environmentId}/checkouts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.DYNAMIC_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[api/checkout] Dynamic API error:", res.status, text);
    return NextResponse.json(
      { error: "Failed to create checkout", detail: text },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json({ checkoutId: data.id });
}
