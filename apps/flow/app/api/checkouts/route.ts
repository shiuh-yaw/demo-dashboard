/**
 * POST /api/checkouts — create a Flow server-side once amount is known.
 *
 * Requires `amount` + `currency`. Creates via
 * `POST /server/{envId}/flow/{mode}` (flow.write API token).
 */

import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { DYNAMIC_DESTINATION_ADDRESS_PATTERN } from "@/lib/checkouts-api";
import {
  chainFamilyFor,
  chainIdFor,
  settlementTokenAddressFor,
  tokenDecimalsFor,
} from "@/lib/flow-snippets";

interface CreateFlowBody {
  destinationAddress?: string;
  destinationChain?: string;
  asset?: string;
  chain?: string;
  mode?: string;
  amount?: string;
  currency?: string;
}

export async function POST(request: NextRequest) {
  const token = env.DYNAMIC_API_TOKEN;
  const envId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  if (!token) {
    return NextResponse.json(
      { error: "DYNAMIC_API_TOKEN is not configured" },
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
    destinationAddress,
    destinationChain = "EVM",
    asset = "USDC",
    chain = "base",
    mode = "withdraw",
    amount,
    currency = "USD",
  } = body;

  if (!amount) {
    return NextResponse.json(
      { error: "amount is required — create the Flow after the user picks an amount" },
      { status: 400 },
    );
  }

  if (
    destinationAddress &&
    !DYNAMIC_DESTINATION_ADDRESS_PATTERN.test(destinationAddress)
  ) {
    return NextResponse.json(
      {
        error:
          "destinationAddress must match ^[A-Za-z0-9_]{18,100}$",
      },
      { status: 400 },
    );
  }

  const flowMode =
    mode === "withdraw" ? "withdraw" : mode === "deposit" ? "deposit" : "payment";

  const chainName = chainFamilyFor(chain);
  const chainIdValue = chainIdFor(chain);

  let tokenAddress: string;
  try {
    tokenAddress = settlementTokenAddressFor(asset, chain);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : `Unknown settlement pair asset="${asset}" chain="${chain}"`,
      },
      { status: 400 },
    );
  }
  const tokenDecimals = tokenDecimalsFor(asset);

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
          strategy: "preferred_order",
          settlements: [
            {
              chainName,
              chainId: chainIdValue,
              symbol: asset,
              tokenAddress,
              tokenDecimals,
            },
          ],
        },
        destinationConfig: {
          destinations: [
            {
              chainName: destinationChain,
              type: "address",
              identifier:
                destinationAddress ||
                "0x0000000000000000000000000000000000000001",
            },
          ],
        },
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
        "Set DYNAMIC_API_TOKEN (or DYNAMIC_API_KEY) to an API key created " +
        "in that same Dynamic environment with flow.write scope — not the " +
        "dashboard operator env token.";
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
