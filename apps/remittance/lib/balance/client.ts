"use client";

/**
 * Client-side USDC balance fetch.
 * Uses viem + public Base Sepolia RPC (no Dynamic balances API).
 */

import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { USDC_CONTRACT_ADDRESS, USDC_DECIMALS } from "@/lib/constants";

const erc20BalanceOfAbi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

/**
 * Fetch USDC balance for an address on Base Sepolia.
 * Returns human-readable balance (e.g. 100.5) or 0 if fetch fails.
 */
export async function getUsdcBalance(walletAddress: string): Promise<number> {
  try {
    const balance = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc20BalanceOfAbi,
      functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    });

    return Number(formatUnits(balance, USDC_DECIMALS));
  } catch {
    return 0;
  }
}
