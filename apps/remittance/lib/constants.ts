/**
 * Remittance App Constants
 */

/** USDC contract on Base Sepolia */
export const USDC_CONTRACT_ADDRESS =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

/** USDC uses 6 decimals */
export const USDC_DECIMALS = 6;

/** Base Sepolia chain ID */
export const BASE_SEPOLIA_CHAIN_ID = 84532;

/** Parse a Dynamic networkId string (e.g. "evm-84532") to a numeric chain ID */
export function parseNetworkId(networkId: string | undefined): number {
  if (!networkId) return BASE_SEPOLIA_CHAIN_ID;
  const match = networkId.match(/evm-(\d+)/);
  return match?.[1] ? parseInt(match[1], 10) : BASE_SEPOLIA_CHAIN_ID;
}
