"use client";

import { createPublicClient, http } from "viem";
import { baseSepolia, sepolia, polygon } from "viem/chains";

/**
 * Minimum viable public client per chain. Used for read-only on-chain checks
 * (e.g. "has this EOA been 7702-delegated or kernel deployed?"). Kept separate
 * from the Dynamic kernel client which handles writes.
 */
const CLIENTS = {
  137: createPublicClient({
    chain: polygon,
    transport: http(),
  }),
  84532: createPublicClient({
    chain: baseSepolia,
    transport: http(),
  }),
  11155111: createPublicClient({
    chain: sepolia,
    transport: http(),
  }),
} as const;

export function getPublicClient(chainId: number) {
  return CLIENTS[chainId as keyof typeof CLIENTS] ?? null;
}

/**
 * Returns true if the address has bytecode (meaning it is a smart contract
 * OR an EOA that has been EIP-7702-delegated to a kernel implementation).
 * Lets callers skip the "Activate your wallet" step when the kernel has
 * already been installed.
 */
export async function isSmartAccountDelegated(
  address: `0x${string}`,
  chainId: number,
): Promise<boolean> {
  const client = getPublicClient(chainId);
  if (!client) return false;
  try {
    const code = await client.getCode({ address });
    return !!code && code !== "0x";
  } catch {
    return false;
  }
}
