/**
 * Canonical `Token` records for every (symbol, chain) pair the
 * `apps/flow` demos surface.
 *
 * Single source of truth: anywhere we need a Token literal — the
 * checkout demo's destination, the deposit demo's destination, the
 * withdraw settlement picker, the snippet generator's lookup — pulls
 * from here. Address / chainId / decimals / icon drift is impossible
 * by construction.
 *
 * Native EVM tokens use the canonical zero address as their on-chain
 * identifier (the Dynamic routing engine treats it as the native-token
 * marker). Native Solana uses the wrapped-native SPL mint
 * (`So111…112`), which is what the SOL chain's routing layer expects.
 */

import type { Token } from "@dynamic-demos/checkouts-widget";

// =============================================================================
// USDC — Circle stablecoin across 4 chains
// =============================================================================

export const USDC_BASE: Token = {
  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  chainId: 8453,
  symbol: "USDC",
  decimals: 6,
  name: "USD Coin",
  logoURI: "https://api.iconify.design/cryptocurrency/usdc.svg",
};

export const USDC_ETHEREUM: Token = {
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  chainId: 1,
  symbol: "USDC",
  decimals: 6,
  name: "USD Coin",
  logoURI: "https://api.iconify.design/cryptocurrency/usdc.svg",
};

export const USDC_POLYGON: Token = {
  address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  chainId: 137,
  symbol: "USDC",
  decimals: 6,
  name: "USD Coin",
  logoURI: "https://api.iconify.design/cryptocurrency/usdc.svg",
};

export const USDC_BASE_SEPOLIA: Token = {
  // Circle faucet USDC on Base Sepolia (testnet).
  address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  chainId: 84532,
  symbol: "USDC",
  decimals: 6,
  name: "USD Coin",
  logoURI: "https://api.iconify.design/cryptocurrency/usdc.svg",
};

export const USDC_ETH_SEPOLIA: Token = {
  // Circle faucet USDC on Ethereum Sepolia (testnet).
  address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  chainId: 11155111,
  symbol: "USDC",
  decimals: 6,
  name: "USD Coin",
  logoURI: "https://api.iconify.design/cryptocurrency/usdc.svg",
};

export const USDC_ARB_SEPOLIA: Token = {
  // USDC on Arbitrum Sepolia (testnet).
  address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  chainId: 421614,
  symbol: "USDC",
  decimals: 6,
  name: "USD Coin",
  logoURI: "https://api.iconify.design/cryptocurrency/usdc.svg",
};

export const USDC_SOLANA: Token = {
  // SPL mint for USDC on Solana mainnet (Circle).
  address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  chainId: 101,
  symbol: "USDC",
  decimals: 6,
  name: "USD Coin",
  logoURI: "https://api.iconify.design/cryptocurrency/usdc.svg",
};

// =============================================================================
// USDT — Tether stablecoin
// =============================================================================

export const USDT_ETHEREUM: Token = {
  address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  chainId: 1,
  symbol: "USDT",
  decimals: 6,
  name: "Tether USD",
  logoURI: "https://api.iconify.design/cryptocurrency/usdt.svg",
};

// =============================================================================
// Native tokens
// =============================================================================

export const ETH_BASE: Token = {
  // Zero address is the conventional native-token marker on EVM.
  address: "0x0000000000000000000000000000000000000000",
  chainId: 8453,
  symbol: "ETH",
  decimals: 18,
  name: "Ether",
  logoURI: "https://api.iconify.design/cryptocurrency/eth.svg",
};

export const ETH_ETHEREUM: Token = {
  address: "0x0000000000000000000000000000000000000000",
  chainId: 1,
  symbol: "ETH",
  decimals: 18,
  name: "Ether",
  logoURI: "https://api.iconify.design/cryptocurrency/eth.svg",
};

export const SOL_SOLANA: Token = {
  // Wrapped-native SOL mint — what Solana's routing layer expects as the
  // native-token marker (the system program doesn't have an SPL address).
  address: "So11111111111111111111111111111111111111112",
  chainId: 101,
  symbol: "SOL",
  decimals: 9,
  name: "Solana",
  logoURI: "https://api.iconify.design/cryptocurrency/sol.svg",
};

// =============================================================================
// Lookup
// =============================================================================

/**
 * Every Token in the catalog as a flat array. Order matches the
 * preferred-default ordering for the withdraw scenario's picker.
 */
export const TOKEN_CATALOG = [
  USDC_BASE,
  USDC_BASE_SEPOLIA,
  USDC_ETH_SEPOLIA,
  USDC_ARB_SEPOLIA,
  USDC_ETHEREUM,
  USDC_POLYGON,
  ETH_BASE,
  ETH_ETHEREUM,
  USDC_SOLANA,
  SOL_SOLANA,
  USDT_ETHEREUM,
] as const satisfies readonly Token[];

/**
 * The chain keys recognised across the demo. Maps the user-facing
 * label ("base", "solana") onto Token.chainId for catalog lookups.
 */
const CHAIN_KEY_TO_CHAIN_ID: Record<string, number> = {
  base: 8453,
  "base-sepolia": 84532,
  "eth-sepolia": 11155111,
  "arb-sepolia": 421614,
  ethereum: 1,
  polygon: 137,
  solana: 101,
};

/**
 * Look up a Token by (symbol, chainKey). Returns null if no catalog
 * entry matches — call sites that require a match should throw
 * loudly so drift surfaces at use, not as silent fallback.
 */
export function findTokenByAssetChain(
  symbol: string,
  chainKey: string,
): Token | null {
  const chainId = CHAIN_KEY_TO_CHAIN_ID[chainKey];
  if (chainId === undefined) return null;
  return (
    TOKEN_CATALOG.find(
      (t) => t.symbol === symbol && t.chainId === chainId,
    ) ?? null
  );
}
