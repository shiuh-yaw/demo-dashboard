"use client";

/**
 * RUSDC wallet-balance read. Dynamic's balance API does not cover Base
 * Sepolia, so the balance is read directly via viem `balanceOf` against the
 * baseSepolia chain (a viem call, not a Dynamic re-impl).
 */

import { createPublicClient, http, formatUnits, erc20Abi, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { RUSDC_ADDRESS, RUSDC_DECIMALS } from "@/lib/constants";

export async function readRusdcBalance(
  address: string,
): Promise<{ raw: bigint; formatted: string }> {
  const client = createPublicClient({ chain: baseSepolia, transport: http() });
  const raw = (await client.readContract({
    address: RUSDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as Hex],
  })) as bigint;
  return { raw, formatted: formatUnits(raw, RUSDC_DECIMALS) };
}
