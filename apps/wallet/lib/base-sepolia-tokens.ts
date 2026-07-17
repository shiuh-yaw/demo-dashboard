/**
 * ERC-20 tokens the asset picker surfaces on Base Sepolia.
 *
 * Base Sepolia (chainId 84532) is NOT covered by Dynamic's balances API,
 * so these are read via Alchemy in `app/api/balances/route.ts`. Keep the
 * shape aligned with `TokenBalanceInfo` (minus the runtime `balance`).
 */

export const BASE_SEPOLIA_NETWORK_ID = 84532;

export interface BaseSepoliaToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

export const BASE_SEPOLIA_TOKENS: BaseSepoliaToken[] = [
  {
    // Circle faucet USDC on Base Sepolia (testnet).
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoURI: "https://api.iconify.design/cryptocurrency/usdc.svg",
  },
];
