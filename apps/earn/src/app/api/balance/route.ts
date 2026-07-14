/**
 * GET /api/balance?address=0x...
 *
 * Dynamic USDC balance on Base Sepolia for a wallet, read via Alchemy.
 * The creator-balance card used the Dynamic SDK's multichain balances,
 * but Dynamic's balances API doesn't cover Base Sepolia - funded wallets
 * showed 0.00. This route reads the ERC-20 balance from Alchemy instead;
 * the Alchemy key stays server-only.
 *
 * Requires an authenticated Dynamic session (Authorization: Bearer <jwt>).
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  getTokenBalances,
  formatTokenBalance,
  ALCHEMY_NETWORKS,
} from "@dynamic-demos/alchemy";
import { getAuthenticatedUser } from "@dynamic-demos/dynamic";
import { env } from "@/env";
import { getDynamicUsdcAddress, DEFAULT_CHAIN_ID } from "@/lib/contracts";

/** Dynamic USDC uses 6 decimals (see use-send-to-wallet / use-send-to-dead). */
const USDC_DECIMALS = 6;

export async function GET(request: NextRequest) {
  const payload = await getAuthenticatedUser(
    request,
    env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  );
  if (!payload?.sub) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const address = request.nextUrl.searchParams.get("address");
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "A valid EVM address is required" },
      { status: 400 },
    );
  }

  if (!env.ALCHEMY_API_KEY) {
    return NextResponse.json(
      { error: "ALCHEMY_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const usdcAddress = getDynamicUsdcAddress(DEFAULT_CHAIN_ID);
  const network = ALCHEMY_NETWORKS[parseInt(DEFAULT_CHAIN_ID, 10)];
  if (!usdcAddress || !network) {
    return NextResponse.json({ balance: 0 });
  }

  try {
    const result = await getTokenBalances(
      { address, contractAddresses: [usdcAddress] },
      { apiKey: env.ALCHEMY_API_KEY, network },
    );

    return NextResponse.json({
      balance: formatTokenBalance(
        result.tokenBalances[0]?.tokenBalance,
        USDC_DECIMALS,
      ),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Balance fetch failed" },
      { status: 502 },
    );
  }
}
