/**
 * Server-side USDC balance fetch.
 * Uses viem + Alchemy RPC for Base Sepolia.
 */

import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { formatUnits } from "viem";
import { env } from "@/lib/env";
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

/**
 * Fetch USDC balance for an address on Base Sepolia.
 * Returns human-readable balance (e.g. 100.5) or 0 if fetch fails.
 */
export async function getServerUsdcBalance(
  walletAddress: string | null,
): Promise<number> {
  if (!walletAddress) return 0;

  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  try {
    const balance = await client.readContract({
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
