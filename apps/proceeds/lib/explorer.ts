/**
 * Block-explorer URL builders keyed by chain id. Centralizes the "which host
 * do we link to?" decision so we can add chains without scattering string
 * templates across the codebase.
 */

const EXPLORERS: Record<number, string> = {
  // Base Sepolia (testnet, used for the stablecoin payout demo)
  84532: "https://sepolia.basescan.org",
  // Base mainnet
  8453: "https://basescan.org",
  // Ethereum mainnet
  1: "https://etherscan.io",
  // Ethereum Sepolia
  11155111: "https://sepolia.etherscan.io",
  // Polygon mainnet
  137: "https://polygonscan.com",
  // Polygon Amoy
  80002: "https://amoy.polygonscan.com",
};

function baseFor(chainId: number): string | null {
  return EXPLORERS[chainId] ?? null;
}

/** URL to view a transaction on the correct explorer for the given chain. */
export function txUrl(chainId: number, hash: string): string | null {
  const base = baseFor(chainId);
  return base ? `${base}/tx/${hash}` : null;
}

/** URL to view an address (EOA or contract) on the correct explorer. */
export function addressUrl(
  chainId: number,
  address: string,
): string | null {
  const base = baseFor(chainId);
  return base ? `${base}/address/${address}` : null;
}
