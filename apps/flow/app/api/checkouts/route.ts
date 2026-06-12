/**
 * POST /api/checkouts — mint a per-withdraw Flow Checkout.
 *
 * The withdraw flow points settlement at a user-entered external
 * address that changes per transaction, so we can't reuse one
 * pre-baked Checkout id like /checkout and /deposit do. This route
 * creates a fresh Checkout server-side (the API token is admin-scoped
 * and never goes to the client) and returns the `checkoutId` for the
 * widget to mount against.
 *
 * Request body shape (mirrors `lib/flow-snippets.ts`'s render logic so
 * the live + displayed snippets stay aligned):
 *   {
 *     destinationAddress: string;        // user's external wallet
 *     destinationChain:   "EVM" | "SOL"; // chain family of that wallet
 *     asset?:             string;        // settlement asset, default "USDC"
 *     chain?:             string;        // settlement chain, default "base"
 *     mode?:              string;        // Flow mode label, default "withdraw"
 *   }
 *
 * Auth: `DYNAMIC_API_TOKEN` — server-side env var. 503 if missing so
 * dev/test can detect misconfiguration loudly without bricking the
 * page render.
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

interface CreateCheckoutBody {
  destinationAddress?: string;
  destinationChain?: string;
  asset?: string;
  chain?: string;
  mode?: string;
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

  let body: CreateCheckoutBody;
  try {
    body = (await request.json()) as CreateCheckoutBody;
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
  } = body;

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

  // Dynamic's Checkout API only accepts `payment | deposit`. There's
  // no "withdraw" primitive — user-to-user withdrawals are modeled as
  // a deposit from the user's wallet into another address, so they
  // map onto the deposit mode at the upstream boundary. Internal
  // callers still use intent-named modes ("withdraw" / "deposit");
  // we collapse them here.
  const upstreamMode = mode === "withdraw" ? "deposit" : mode;

  const chainName = chainFamilyFor(chain);
  const chainIdValue = chainIdFor(chain);
  // settlementTokenAddressFor throws on unknown (asset, chain) pairs to
  // surface drift between UI pickers and the resolver. Convert the
  // throw to a 400 so the widget can render a clean message instead of
  // bubbling a 500.
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

  const upstream = await fetch(
    `https://app.dynamicauth.com/api/v0/environments/${envId}/checkouts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: upstreamMode,
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
              type: "address" as const,
              // When no explicit destination is provided (e.g. testnet
              // checkouts where the wallet isn't connected yet), use
              // a placeholder. The per-transaction `destinationAddresses`
              // in `beginCheckout` overrides this at execution time.
              identifier:
                destinationAddress ||
                "0x0000000000000000000000000000000000000001",
            },
          ],
        },
      }),
    },
  );

  if (!upstream.ok) {
    const text = await upstream.text();
    // Surface the upstream detail in the error message so the widget
    // can display a useful diagnostic (not just "rejected").
    let detail = "Dynamic API rejected the Checkout creation";
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      if (parsed.message) detail = parsed.message;
      else if (parsed.error) detail = parsed.error;
    } catch {
      if (text.length > 0 && text.length < 200) detail = text;
    }
    return NextResponse.json(
      {
        error: detail,
        upstream: text.slice(0, 1000),
      },
      { status: upstream.status },
    );
  }

  const json = (await upstream.json()) as { id?: string };
  if (!json?.id) {
    return NextResponse.json(
      { error: "Dynamic API returned no checkout id" },
      { status: 502 },
    );
  }

  return NextResponse.json({ checkoutId: json.id });
}
