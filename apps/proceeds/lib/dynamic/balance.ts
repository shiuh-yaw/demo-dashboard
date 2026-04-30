"use client";

import { getMultichainBalances as sdkGetMultichainBalances } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

export interface TokenBalanceInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  balance: number;
  rawBalance: number;
  price?: number;
  marketValue?: number;
  isNative?: boolean;
}

export async function getTokenBalances({
  address,
  chain,
  networkId,
  whitelistedContracts,
}: {
  address: string;
  chain: string;
  networkId: number;
  /**
   * Explicitly ask the Dynamic indexer to include these contract addresses in
   * the result. Required for custom/testnet tokens (e.g. our mintable Dynamic
   * USDC on Base Sepolia) that aren't in the default token lists.
   */
  whitelistedContracts?: `0x${string}`[];
}): Promise<TokenBalanceInfo[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const chainBalances = await sdkGetMultichainBalances({
      balanceRequest: {
        filterSpamTokens: true,
        balanceRequests: [
          {
            address,
            chain: chain as "EVM",
            networkIds: [networkId],
            ...(whitelistedContracts?.length
              ? { whitelistedContracts }
              : {}),
          },
        ],
      },
    });

    return (
      chainBalances?.flatMap((cb) =>
        (cb.networks ?? []).flatMap((n) =>
          (n.balances ?? []) as TokenBalanceInfo[],
        ),
      ) ?? []
    );
  } catch {
    return [];
  }
}
