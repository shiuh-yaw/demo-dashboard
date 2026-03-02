/**
 * Smart Contract Constants
 *
 * Contains contract addresses and ABIs for interacting with blockchain contracts.
 * Dynamic USDC is a testnet USDC contract that allows minting for demo purposes.
 */

/**
 * Dynamic USDC Contract Addresses
 * Testnet contracts that allow minting for demo purposes
 */
export const DYNAMIC_USDC_CONTRACTS = {
  "84532": "0x678d798938bd326d76e5db814457841d055560d0", // Base Sepolia - Dynamic USDC
} as const;

/**
 * Dynamic USDC Contract ABI
 * Contains the mint function that allows users to mint testnet USDC
 */
export const DYNAMIC_USDC_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountDollars",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Get Dynamic USDC contract address for a given chain ID
 */
export function getDynamicUsdcAddress(chainId: string): `0x${string}` | null {
  return (
    (DYNAMIC_USDC_CONTRACTS[
      chainId as keyof typeof DYNAMIC_USDC_CONTRACTS
    ] as `0x${string}`) || null
  );
}

/**
 * Default chain ID for the application (Base Sepolia)
 */
export const DEFAULT_CHAIN_ID = "84532";
