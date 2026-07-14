/**
 * GET /api/kyc-deposit/balances?address=0x...
 *
 * USDC balance on Base Sepolia for the connected wallet, read via Alchemy.
 * The /kyc-deposit demo can't use the Dynamic SDK `getBalances` like every
 * other flow slot because Dynamic's balances API doesn't cover Base Sepolia
 * - the asset picker would show no USDC even for funded wallets. This route
 * backs the widget's `fetchTokens` override for that demo only.
 *
 * Server-only: the Alchemy key never reaches the browser. Requires an
 * authenticated Dynamic session (same gate as the other kyc-deposit routes).
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  getTokenBalances,
  formatTokenBalance,
  ALCHEMY_NETWORKS,
} from "@dynamic-demos/alchemy";
import { getAuthenticatedUser } from "@dynamic-demos/dynamic";
import { env } from "@/lib/env";
import { USDC_BASE_SEPOLIA } from "@/lib/tokens";

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

  const network = ALCHEMY_NETWORKS[USDC_BASE_SEPOLIA.chainId];
  if (!network) {
    return NextResponse.json({ balance: 0, rawBalance: "0x0" });
  }

  try {
    const result = await getTokenBalances(
      { address, contractAddresses: [USDC_BASE_SEPOLIA.address] },
      { apiKey: env.ALCHEMY_API_KEY, network },
    );

    const entry = result.tokenBalances[0];
    return NextResponse.json({
      balance: formatTokenBalance(
        entry?.tokenBalance,
        USDC_BASE_SEPOLIA.decimals,
      ),
      rawBalance: entry?.tokenBalance ?? "0x0",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Balance fetch failed" },
      { status: 502 },
    );
  }
}
