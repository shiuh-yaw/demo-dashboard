/**
 * POST /api/checkouts — create a Flow server-side once amount is known.
 *
 * Requires `amount` + `currency`. Creates via
 * `POST /server/{envId}/flow/{mode}` (flow.write API token).
 *
 * Accepts settlement + destination config in the same shape the
 * Dynamic Flow API expects — callers pass `settlementConfig` and
 * `destinationConfig` directly so new chains (TRON, etc.) work
 * without route changes.
 */

import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { DYNAMIC_DESTINATION_ADDRESS_PATTERN } from "@/lib/checkouts-api";

interface Settlement {
  chainName: string;
  chainId: string;
  symbol: string;
  tokenAddress: string;
  tokenDecimals: number;
}

interface Destination {
  chainName: string;
  type: string;
  identifier: string;
}

interface CreateFlowBody {
  mode?: string;
  amount?: string;
  currency?: string;
  /** Settlement config — passed through to the Dynamic Flow API. */
  settlementConfig?: {
    strategy?: string;
    settlements?: Settlement[];
  };
  /** Destination config — passed through to the Dynamic Flow API. */
  destinationConfig?: {
    destinations?: Destination[];
  };
}

export async function POST(request: NextRequest) {
  const token = env.DYNAMIC_API_KEY;
  const envId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  if (!token) {
    return NextResponse.json(
      { error: "DYNAMIC_API_KEY is not configured" },
      { status: 503 },
    );
  }
  if (!envId) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is not configured" },
      { status: 503 },
    );
  }

  let body: CreateFlowBody;
  try {
    body = (await request.json()) as CreateFlowBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const {
    mode = "withdraw",
    amount,
    currency = "USD",
    settlementConfig,
    destinationConfig,
  } = body;

  if (!amount) {
    return NextResponse.json(
      { error: "amount is required — create the Flow after the user picks an amount" },
      { status: 400 },
    );
  }

  if (!settlementConfig?.settlements?.length) {
    return NextResponse.json(
      { error: "settlementConfig.settlements is required" },
      { status: 400 },
    );
  }

  if (!destinationConfig?.destinations?.length) {
    return NextResponse.json(
      { error: "destinationConfig.destinations is required" },
      { status: 400 },
    );
  }

  for (const dest of destinationConfig.destinations) {
    if (
      dest.identifier &&
      !DYNAMIC_DESTINATION_ADDRESS_PATTERN.test(dest.identifier)
    ) {
      return NextResponse.json(
        {
          error:
            `destinationAddress "${dest.identifier}" must match ^[A-Za-z0-9_]{18,100}$`,
        },
        { status: 400 },
      );
    }
  }

  const flowMode =
    mode === "withdraw" ? "withdraw" : mode === "deposit" ? "deposit" : "payment";

  const flowRes = await fetch(
    `https://app.dynamic.xyz/api/v0/server/${envId}/flow/${flowMode}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        settlementConfig: {
          strategy: settlementConfig.strategy ?? "preferred_order",
          settlements: settlementConfig.settlements,
        },
        destinationConfig,
      }),
    },
  );

  if (!flowRes.ok) {
    const text = await flowRes.text();
    let detail = "Dynamic API rejected the Flow creation";
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      if (parsed.message) detail = parsed.message;
      else if (parsed.error) detail = parsed.error;
    } catch {
      if (text.length > 0 && text.length < 200) detail = text;
    }
    if (
      (flowRes.status === 401 || flowRes.status === 403) &&
      (detail === "Unauthorized" ||
        detail.includes("Insufficient scope permissions"))
    ) {
      detail =
        `Dynamic API token rejected for environment ${envId}. ` +
        "Set DYNAMIC_API_KEY to an API key created in that same Dynamic " +
        "environment with flow.write scope — not the dashboard operator " +
        "env token.";
    }
    return NextResponse.json(
      { error: detail, upstream: text.slice(0, 1000) },
      { status: flowRes.status },
    );
  }

  const flowJson = (await flowRes.json()) as { flow?: { id?: string } };
  const flowId = flowJson.flow?.id;
  if (!flowId) {
    return NextResponse.json(
      { error: "Dynamic API returned no flow id" },
      { status: 502 },
    );
  }

  return NextResponse.json({ flowId });
}
