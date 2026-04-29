import { env } from "@/lib/env";
import { assertSafeTransactionId } from "@/lib/validation";

const API_BASE = "https://app.dynamic.xyz/api/v0";

// SDK-path polling endpoint per Dynamic docs:
// https://www.dynamic.xyz/docs/recipes/integrations/checkouts/checkout-api
// Unlike the management API this is public/no-auth and returns the canonical
// transaction record we use for settlement verification.
const SDK_API_BASE = "https://app.dynamicauth.com/api/v0";

// Base USDC (Circle) contract address (verified):
// https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Cap on how long we'll wait on the Dynamic status endpoint. Without a
// timeout a slow/hung upstream holds the server action open for Next.js's
// default timeout (tens of seconds) and becomes a DoS surface.
const DYNAMIC_FETCH_TIMEOUT_MS = 10_000;

export type DynamicCheckoutTransaction = {
  id: string;
  executionState: string;
  settlementState: string;
  completedAt?: string;
  txHash?: string;
  toAddress?: string;
  toChainId?: string;
  toToken?: string;
  // `quote.toAmount` is the settled-destination amount in the destination
  // token's base units (6-decimal USDC micro-units when settling to Base
  // USDC). Locked in via `toAmountMin` in the router call at quote time —
  // once `settlementState === "completed"` it's the floor of what arrived.
  quote?: {
    toAmount?: string;
  };
};

export async function fetchCheckoutTransaction(
  transactionId: string,
): Promise<DynamicCheckoutTransaction> {
  // Bound the input before it flows into the URL path. Dynamic tx ids are
  // UUIDs; anything else is either a bug or an injection attempt and we'd
  // rather fail at our edge than propagate garbage to their API.
  const safeId = assertSafeTransactionId(transactionId);
  const response = await fetch(
    `${SDK_API_BASE}/sdk/${env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID}/transactions/${safeId}`,
    { cache: "no-store", signal: AbortSignal.timeout(DYNAMIC_FETCH_TIMEOUT_MS) },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Dynamic API ${response.status}: ${text.slice(0, 200)}`);
  }
  return (await response.json()) as DynamicCheckoutTransaction;
}

export async function createCheckout(args: {
  destinationAddress: string;
}): Promise<{ checkoutId: string }> {
  const body = {
    mode: "payment",
    settlementConfig: {
      strategy: "cheapest",
      settlements: [
        {
          chainName: "EVM",
          tokenAddress: BASE_USDC_ADDRESS,
          chainId: "8453",
          symbol: "USDC",
          tokenDecimals: 6,
          isNative: false,
        },
      ],
    },
    destinationConfig: {
      destinations: [
        {
          chainName: "EVM",
          type: "address",
          identifier: args.destinationAddress,
        },
      ],
    },
  };

  const response = await fetch(
    `${API_BASE}/environments/${env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID}/checkouts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.DYNAMIC_API_KEY}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Dynamic API ${response.status}: ${text.slice(0, 200)}`);
  }
  const json = (await response.json()) as { id: string };
  return { checkoutId: json.id };
}
