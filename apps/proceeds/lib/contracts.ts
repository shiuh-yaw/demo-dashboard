/**
 * Dynamic USDC (testnet) contract addresses and ABI.
 *
 * This is the mintable demo USDC used to simulate Apple paying out a
 * developer's monthly proceeds on-chain. The contract exposes a public
 * `mint(uint256 amountDollars)` that mints whole-dollar amounts.
 */

export const DYNAMIC_USDC_CONTRACTS = {
  // Base Sepolia
  84532: "0x678d798938bd326d76e5db814457841d055560d0",
} as const;

export const DYNAMIC_USDC_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "_amountDollars", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/** Get the Dynamic USDC contract address for a given chain id. */
export function getDynamicUsdcAddress(
  chainId: number,
): `0x${string}` | null {
  return (
    (DYNAMIC_USDC_CONTRACTS[
      chainId as keyof typeof DYNAMIC_USDC_CONTRACTS
    ] as `0x${string}`) ?? null
  );
}

/** Default chain for demo payouts. */
export const DEMO_PAYOUT_CHAIN_ID = 84532;
