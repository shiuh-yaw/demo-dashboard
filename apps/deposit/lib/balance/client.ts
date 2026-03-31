"use client";

import { createPublicClient, formatUnits, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { DEPOSIT_ASSETS } from "@/lib/assets";

const erc20BalanceOfAbi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function publicClientFor(network: "base" | "base-sepolia") {
  const chain = network === "base" ? base : baseSepolia;
  const url =
    network === "base"
      ? "https://mainnet.base.org"
      : "https://sepolia.base.org";
  return createPublicClient({
    chain,
    transport: http(url),
  });
}

function formatTokenDisplay(raw: bigint, decimals: number): string {
  const s = formatUnits(raw, decimals);
  if (!s.includes(".")) return s;
  const trimmed = s.replace(/\.?0+$/, "");
  return trimmed === "" ? "0" : trimmed;
}

/**
 * USDC balance for an address on the deposit network (on-chain, same USDC as deposits).
 */
export async function getDepositUsdcBalance(
  walletAddress: `0x${string}`,
  network: "base" | "base-sepolia",
): Promise<string> {
  const asset = DEPOSIT_ASSETS.USDC;
  const client = publicClientFor(network);
  const balance = await client.readContract({
    address: asset.contract[network],
    abi: erc20BalanceOfAbi,
    functionName: "balanceOf",
    args: [walletAddress],
  });
  return formatTokenDisplay(balance, asset.decimals);
}
