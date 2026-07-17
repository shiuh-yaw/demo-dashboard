/**
 * GET /api/balances?address=0x...&networkId=84532
 *
 * ERC-20 token balances for networks Dynamic's balances API doesn't
 * cover - currently just Base Sepolia (84532), read via Alchemy. Every
 * other network is served by the SDK's `getMultichainBalances` on the
 * client; this route is the escape hatch the asset picker merges in.
 *
 * Server-only: the Alchemy key never reaches the browser. Requires an
 * authenticated Dynamic session (Bearer token from the client).
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  getTokenBalances,
  formatTokenBalance,
  ALCHEMY_NETWORKS,
} from "@dynamic-demos/alchemy";
import { getAuthenticatedUser } from "@dynamic-demos/dynamic";
import { env } from "@/lib/env";
import {
  BASE_SEPOLIA_NETWORK_ID,
  BASE_SEPOLIA_TOKENS,
} from "@/lib/base-sepolia-tokens";
import type { TokenBalanceInfo } from "@/lib/dynamic";

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
  const networkId = Number(request.nextUrl.searchParams.get("networkId"));
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "A valid EVM address is required" },
      { status: 400 },
    );
  }

  // Only Base Sepolia routes through Alchemy today; anything else is a
  // client/SDK concern, so return an empty set rather than erroring.
  if (networkId !== BASE_SEPOLIA_NETWORK_ID) {
    return NextResponse.json({ balances: [] });
  }

  if (!env.ALCHEMY_API_KEY) {
    return NextResponse.json(
      { error: "ALCHEMY_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const network = ALCHEMY_NETWORKS[BASE_SEPOLIA_NETWORK_ID];
  if (!network) return NextResponse.json({ balances: [] });

  try {
    const result = await getTokenBalances(
      {
        address,
        contractAddresses: BASE_SEPOLIA_TOKENS.map((t) => t.address),
      },
      { apiKey: env.ALCHEMY_API_KEY, network },
    );

    const byAddress = new Map(
      result.tokenBalances.map((entry) => [
        entry.contractAddress.toLowerCase(),
        entry.tokenBalance,
      ]),
    );

    const balances: TokenBalanceInfo[] = BASE_SEPOLIA_TOKENS.map((token) => ({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      logoURI: token.logoURI,
      balance: formatTokenBalance(
        byAddress.get(token.address.toLowerCase()),
        token.decimals,
      ),
      isNative: false,
    }));

    return NextResponse.json({ balances });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Balance fetch failed" },
      { status: 502 },
    );
  }
}
