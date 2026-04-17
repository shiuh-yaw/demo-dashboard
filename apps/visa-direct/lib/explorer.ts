/**
 * Block-explorer URL builders keyed by chain id. Centralised so the
 * "which host do we link to?" decision lives in one place instead of
 * scattered string templates across the codebase.
 *
 * Visa-direct is EVM-only today (see `addEvmExtension` in lib/dynamic/
 * client.ts), so Solana explorers are intentionally absent.
 */

const EXPLORERS: Record<number, string> = {
  // Ethereum mainnet
  1: "https://etherscan.io",
  // Ethereum Sepolia
  11155111: "https://sepolia.etherscan.io",
  // Polygon mainnet
  137: "https://polygonscan.com",
  // Polygon Amoy
  80002: "https://amoy.polygonscan.com",
  // Base mainnet
  8453: "https://basescan.org",
  // Base Sepolia
  84532: "https://sepolia.basescan.org",
};

function baseFor(chainId: number): string | null {
  return EXPLORERS[chainId] ?? null;
}

export function txUrl(chainId: number, hash: string): string | null {
  const base = baseFor(chainId);
  return base ? `${base}/tx/${hash}` : null;
}

export function addressUrl(
  chainId: number,
  address: string,
): string | null {
  const base = baseFor(chainId);
  return base ? `${base}/address/${address}` : null;
}
