/**
 * Chain configs for public RPC (read-only) and network switching
 */

import { http, createPublicClient, type Chain } from "viem";
import { base, mainnet, arbitrum } from "viem/chains";

const PUBLIC_RPC: Record<number, string> = {
  1: "https://eth.llamarpc.com",
  8453: "https://mainnet.base.org",
  42161: "https://arb1.arbitrum.io/rpc",
};

export const CHAINS: Record<number, Chain> = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
};

export function getPublicClient(chainId: number) {
  const chain = CHAINS[chainId];
  const rpc = PUBLIC_RPC[chainId];
  if (!chain || !rpc) throw new Error(`Unsupported chain: ${chainId}`);
  return createPublicClient({
    chain,
    transport: http(rpc),
  });
}
