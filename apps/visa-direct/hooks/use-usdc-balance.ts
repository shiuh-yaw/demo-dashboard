"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  getAddress,
  http,
} from "viem";
import {
  SEPOLIA_NETWORK,
  getUsdcAddress,
  REQUIRED_CHAIN_ID,
} from "@/lib/network-config";

export interface TokenBalanceInfo {
  address: string;
  symbol: "USDC";
  decimals: number;
  rawBalance: bigint;
  balance: number;
}

const USDC_DECIMALS = 6;

/**
 * Read the USDC balance for a wallet directly from Sepolia.
 *
 * We deliberately ignore whatever network Dynamic's provider reports
 * as "active" and always read from Sepolia's RPC. If the Dynamic
 * environment doesn't have Sepolia enabled (only mainnet, say), the
 * provider's `NetworkData.rpcUrls` would point at mainnet and the
 * wallet would look empty even though the payout actually landed on
 * Sepolia. Sourcing the RPC from `viem/chains` sidesteps that.
 */
export function useUSDCBalance(walletAddress: string | null | undefined) {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["usdc-balance", "sepolia", walletAddress],
    queryFn: async (): Promise<TokenBalanceInfo | null> => {
      if (!walletAddress) return null;

      const usdcAddress = getUsdcAddress(REQUIRED_CHAIN_ID);
      if (!usdcAddress) return null;

      const client = createPublicClient({
        chain: SEPOLIA_NETWORK.viemChain,
        transport: http(SEPOLIA_NETWORK.rpcUrl),
      });

      const raw = await client.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [getAddress(walletAddress)],
      });

      return {
        address: usdcAddress,
        symbol: "USDC",
        decimals: USDC_DECIMALS,
        rawBalance: raw,
        balance: Number(formatUnits(raw, USDC_DECIMALS)),
      };
    },
    enabled: !!walletAddress,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const numericBalance = data?.balance ?? 0;

  return {
    raw: data,
    formatted:
      numericBalance > 0
        ? numericBalance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) + " USDC"
        : "0.00 USDC",
    usdValue:
      "$" +
      numericBalance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    symbol: "USDC",
    isLoading,
    isFetching,
    isError,
    refetch,
  };
}
