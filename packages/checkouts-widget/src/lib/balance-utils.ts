/**
 * Balance Utilities
 *
 * Shared helpers for parsing and formatting wallet balances
 * from the Dynamic SDK `getMultichainBalances` response.
 *
 * ## Overview
 *
 * The Dynamic SDK returns balances in a nested structure:
 * `response.chainBalances[].networks[].balances[]`
 *
 * This module provides utilities to:
 * - Find a specific token balance by chain and address
 * - Calculate total portfolio value across all chains
 * - Get all balances for a specific network
 *
 * ## Chain ID Support
 *
 * Supports both EVM and Solana chains using Dynamic network IDs:
 * - EVM chains use standard chain IDs (1 for Ethereum, 8453 for Base, etc.)
 * - Solana uses the Dynamic network ID (DYNAMIC_SOLANA_NETWORK_ID from widget-config)
 *
 * ## Usage
 *
 * @example
 * ```tsx
 * import { getMultichainBalances } from "@/lib/dynamicClient";
 * import { findTokenBalance, getTotalBalanceValue } from "@/lib/balance-utils";
 *
 * const response = await getMultichainBalances({ ... });
 *
 * // Find USDC balance on Base (chain 8453)
 * const usdc = findTokenBalance(response, 8453, "TOKEN_ADDRESS");
 * console.log(`USDC: ${usdc?.balance} ($${usdc?.marketValue})`);
 *
 * // Find USDC balance on Solana (use Dynamic's network ID)
 * import { DYNAMIC_SOLANA_NETWORK_ID } from "@/lib/widget-config";
 * const solanaUsdc = findTokenBalance(response, DYNAMIC_SOLANA_NETWORK_ID, "TOKEN_ADDRESS");
 *
 * // Get total portfolio value
 * const total = getTotalBalanceValue(response);
 * console.log(`Total: $${total.toFixed(2)}`);
 * ```
 */

import { ZERO_ADDRESS } from "./chain";

// =============================================================================
// TYPES
// =============================================================================

/** Parsed token balance result */
export interface TokenBalance {
  /** Token symbol (e.g., "USDC", "ETH") */
  symbol: string;
  /** Formatted balance string */
  balance: string;
  /** USD market value */
  marketValue: number;
  /** Token icon URL */
  iconUrl?: string;
  /** Token contract address (undefined for native tokens) */
  address?: string;
}

/** Balance response from getMultichainBalances */
export interface MultichainBalanceResponse {
  chainBalances?: ChainBalance[];
}

interface ChainBalance {
  networks?: NetworkBalance[];
}

interface NetworkBalance {
  networkId: number;
  balances?: TokenBalanceRaw[];
}

interface TokenBalanceRaw {
  symbol?: string;
  name?: string;
  balance?: string;
  marketValue?: string;
  logoURI?: string;
  address?: string;
  decimals?: number;
}

/**
 * Extended token balance with additional metadata.
 * Used by asset selector for payment/deposit flows.
 */
export interface TokenAsset {
  /** Unique identifier (symbol-chainId-address) */
  id: string;
  /** Token display name */
  name: string;
  /** Token symbol (e.g., "USDC", "ETH") */
  symbol: string;
  /** Formatted balance for display (e.g., "0.009969") */
  balance: string;
  /** Raw balance in smallest unit (e.g., wei) as string */
  rawBalance: string;
  /** Token decimals (e.g., 18 for ETH) */
  decimals: number;
  /** USD value of total balance (e.g., "$28.19") */
  usdValue: string;
  /** Price per token in USD (e.g., 2825.50 for ETH) */
  pricePerToken: number;
  /** Token icon URL */
  iconUrl?: string;
  /** Fallback icon URL if primary iconUrl fails to load */
  iconUrlFallback?: string;
  /** Chain ID for the token (e.g., 1 for Ethereum, 137 for Polygon) */
  chainId: number;
  /** Token contract address (undefined for native tokens) */
  tokenAddress?: string;
}

/**
 * Options for filtering token assets during transformation
 */
export interface TokenFilterOptions {
  /** Minimum USD value required (filters out tokens below this amount) */
  minUsdValue?: number;
  /** Whether to exclude zero balances (default: true) */
  excludeZeroBalance?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Exchange-sourced tokens have chainId 0 (not on any blockchain) */
export function isExchangeToken(token: TokenAsset): boolean {
  return token.chainId === 0;
}

/**
 * Find a specific token balance from multichain balance response.
 *
 * @param response - Response from getMultichainBalances (can be array or object)
 * @param chainId - Dynamic network ID to filter by
 * @param tokenAddress - Token contract address (undefined for native token)
 * @returns Parsed token balance or null if not found
 */
export function findTokenBalance(
  response: MultichainBalanceResponse | ChainBalance[] | unknown,
  chainId: number,
  tokenAddress?: string,
): TokenBalance | null {
  // Response can be either { chainBalances: [...] } or the array directly
  const chainBalances = Array.isArray(response)
    ? response
    : (response as MultichainBalanceResponse)?.chainBalances || [];

  for (const chain of chainBalances) {
    for (const network of chain.networks || []) {
      if (network.networkId !== chainId) continue;

      for (const token of network.balances || []) {
        const isMatch = tokenAddress
          ? token.address?.toLowerCase() === tokenAddress.toLowerCase()
          : !token.address; // Native token has no address

        if (isMatch) {
          return {
            symbol: token.symbol || "???",
            balance: parseFloat(token.balance || "0").toFixed(4),
            marketValue: parseFloat(token.marketValue || "0"),
            iconUrl: token.logoURI,
            address: token.address,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Get total USD value across all tokens in a balance response.
 *
 * @param response - Response from getMultichainBalances
 * @returns Total USD market value
 */
export function getTotalBalanceValue(
  response: MultichainBalanceResponse | ChainBalance[] | unknown,
): number {
  const chainBalances = Array.isArray(response)
    ? response
    : (response as MultichainBalanceResponse)?.chainBalances || [];

  let total = 0;

  for (const chain of chainBalances) {
    for (const network of chain.networks || []) {
      for (const token of network.balances || []) {
        total += parseFloat(token.marketValue || "0");
      }
    }
  }

  return total;
}

/**
 * Get all token balances from a specific network.
 *
 * @param response - Response from getMultichainBalances
 * @param chainId - Dynamic network ID to filter by
 * @returns Array of token balances
 */
export function getNetworkBalances(
  response: MultichainBalanceResponse | ChainBalance[] | unknown,
  chainId: number,
): TokenBalance[] {
  const chainBalances = Array.isArray(response)
    ? response
    : (response as MultichainBalanceResponse)?.chainBalances || [];

  const balances: TokenBalance[] = [];

  for (const chain of chainBalances) {
    for (const network of chain.networks || []) {
      if (network.networkId !== chainId) continue;

      for (const token of network.balances || []) {
        balances.push({
          symbol: token.symbol || "???",
          balance: parseFloat(token.balance || "0").toFixed(4),
          marketValue: parseFloat(token.marketValue || "0"),
          iconUrl: token.logoURI,
          address: token.address,
        });
      }
    }
  }

  return balances;
}

// =============================================================================
// ASSET TRANSFORMATION
// =============================================================================

/**
 * Normalize the multichain balance response to a consistent array format.
 * Handles both `{ chainBalances: [...] }` and direct array responses.
 */
export function normalizeBalanceResponse(
  response: MultichainBalanceResponse | ChainBalance[] | unknown,
): ChainBalance[] {
  if (Array.isArray(response)) return response;
  return (response as MultichainBalanceResponse)?.chainBalances || [];
}

/**
 * Transform multichain balance response into TokenAsset array.
 * Applies filtering, formatting, and sorting for UI display.
 *
 * @param response - Response from getMultichainBalances
 * @param options - Filter options (min USD value, exclude zero balances)
 * @returns Array of TokenAsset objects sorted by USD value (highest first)
 *
 * @example
 * ```tsx
 * const response = await getMultichainBalances({ ... });
 * const assets = transformToTokenAssets(response, { minUsdValue: paymentAmount });
 * // Returns only tokens with sufficient balance for the payment
 * ```
 */
export function transformToTokenAssets(
  response: MultichainBalanceResponse | ChainBalance[] | unknown,
  options: TokenFilterOptions = {},
): TokenAsset[] {
  const { minUsdValue = 0, excludeZeroBalance = true } = options;
  const chainBalances = normalizeBalanceResponse(response);
  const assets: TokenAsset[] = [];

  for (const chain of chainBalances) {
    for (const network of chain.networks || []) {
      for (const token of (network as NetworkBalance).balances || []) {
        const balance = parseFloat(token.balance || "0");
        const marketValue = parseFloat(token.marketValue || "0");
        const decimals = token.decimals ?? 18;

        // Apply filters
        if (excludeZeroBalance && balance <= 0) continue;
        if (marketValue < minUsdValue) continue;

        // Calculate price per token
        const pricePerToken = balance > 0 ? marketValue / balance : 0;

        // Calculate raw balance in smallest unit (wei)
        // Use BigInt to avoid floating point precision issues
        const rawBalance = BigInt(
          Math.floor(balance * Math.pow(10, decimals)),
        ).toString();

        assets.push({
          id: `${token.symbol}-${network.networkId}-${
            token.address || "native"
          }`,
          name: token.name || token.symbol || "Unknown Token",
          symbol: token.symbol || "???",
          balance: formatTokenBalance(balance),
          rawBalance,
          decimals,
          usdValue: displayUsdValue(
            token.symbol || "???",
            network.networkId,
            balance,
            marketValue,
          ),
          pricePerToken,
          iconUrl: token.logoURI,
          chainId: network.networkId,
          tokenAddress: token.address,
        });
      }
    }
  }

  // Sort by USD value, highest first
  assets.sort((a, b) => {
    const aValue = parseFloat(a.usdValue.replace(/[$,]/g, ""));
    const bValue = parseFloat(b.usdValue.replace(/[$,]/g, ""));
    return bValue - aValue;
  });

  return assets;
}

/**
 * Flat-shape TokenBalance — matches the SDK 1.3.0 `getBalances`
 * return shape (a single-level array, not the nested
 * `chainBalances[].networks[].balances[]` of `getMultichainBalances`).
 * Mirrored locally so we don't depend on the api-core type directly.
 */
export interface FlatTokenBalance {
  networkId?: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  balance: number;
  rawBalance: number;
  price?: number;
  marketValue?: number;
  isNative?: boolean;
}

/**
 * Transform an SDK 1.3.0 `getBalances` response (flat
 * `TokenBalance[]`) into `TokenAsset[]` for the asset-picker UI.
 *
 * This is the multichain-aware sibling of `transformToTokenAssets`.
 * Where the older nested response carried network id in the
 * `network.networkId` envelope, the flat response embeds it on each
 * row — we read `b.networkId` directly. The caller passes a fallback
 * network id for SDK responses that omit it (single-network calls).
 *
 * @example
 * ```ts
 * const balances = await getBalances({
 *   walletAccount,
 *   networkIds: ["1", "8453", "137"],
 *   includeNative: true,
 *   includePrices: true,
 *   filterSpamTokens: true,
 * });
 * const assets = transformFlatBalancesToTokenAssets(balances, {
 *   minUsdValue: paymentAmount,
 * });
 * ```
 */
export function transformFlatBalancesToTokenAssets(
  balances: FlatTokenBalance[],
  options: TokenFilterOptions & { fallbackNetworkId?: number } = {},
): TokenAsset[] {
  const {
    minUsdValue = 0,
    excludeZeroBalance = true,
    fallbackNetworkId,
  } = options;

  const assets: TokenAsset[] = [];

  for (const b of balances) {
    const balance = b.balance ?? 0;
    const marketValue = b.marketValue ?? 0;
    const decimals = b.decimals ?? 18;

    if (excludeZeroBalance && balance <= 0) continue;
    if (marketValue < minUsdValue) continue;

    const pricePerToken = b.price ?? (balance > 0 ? marketValue / balance : 0);
    // SDK returns rawBalance as a number; widen to BigInt-derived
    // string to keep `TokenAsset.rawBalance` shape stable for callers
    // (some downstream paths treat it as a numeric string).
    const rawBalance =
      typeof b.rawBalance === "number"
        ? BigInt(Math.floor(b.rawBalance)).toString()
        : BigInt(Math.floor(balance * Math.pow(10, decimals))).toString();
    const chainId = b.networkId ?? fallbackNetworkId ?? 0;
    // Native tokens can be identified three ways in the 1.3.0
    // `getBalances` response, depending on chain/version:
    //   1. Explicit `isNative: true` flag (preferred).
    //   2. Empty/undefined `address` (some chains).
    //   3. EVM zero address `0x00…00` (matches the SDK's native
    //      marker convention documented in `getSwapQuote.d.ts`).
    // Treat any of these as native and surface `tokenAddress` as
    // undefined so downstream code (id formatting, quote requests,
    // chain badge rendering) handles native tokens consistently.
    const isNative =
      b.isNative === true ||
      !b.address ||
      b.address.toLowerCase() === ZERO_ADDRESS;
    const tokenAddress = isNative ? undefined : b.address;

    assets.push({
      id: `${b.symbol}-${chainId}-${tokenAddress ?? "native"}`,
      name: b.name || b.symbol || "Unknown Token",
      symbol: b.symbol || "???",
      balance: formatTokenBalance(balance),
      rawBalance,
      decimals,
      usdValue: displayUsdValue(b.symbol || "???", chainId, balance, marketValue),
      pricePerToken,
      iconUrl: b.logoURI,
      chainId,
      tokenAddress,
    });
  }

  // Highest-USD-value first; matches the nested-shape transform.
  assets.sort((a, b) => {
    const aValue = parseFloat(a.usdValue.replace(/[$,]/g, ""));
    const bValue = parseFloat(b.usdValue.replace(/[$,]/g, ""));
    return bValue - aValue;
  });

  return assets;
}

/**
 * Format token balance for display.
 * Handles very small amounts with exponential notation.
 */
function formatTokenBalance(balance: number): string {
  if (balance === 0) return "0";
  if (balance < 0.0001) return balance.toExponential(2);
  if (balance < 1) return balance.toFixed(6);
  if (balance < 1000) return balance.toFixed(4);
  return balance.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Format USD value for display.
 */
function formatUsdValue(amount: number): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Sepolia testnets — no USD price feed, so market value comes back as 0. */
const SEPOLIA_CHAIN_IDS = new Set([
  84532, // Base Sepolia
  11155111, // Ethereum Sepolia
  11155420, // OP Sepolia
  421614, // Arbitrum Sepolia
]);

/** USD-pegged stablecoins whose balance ≈ their dollar value. */
const USD_STABLECOINS = new Set(["USDC", "USDT", "USDB"]);

/**
 * USD value to display for a token row. On Sepolia testnets there's no price
 * feed (market value is 0 → "$0.00"), so for a USD-pegged stablecoin we show
 * the balance itself with a "$" prefix (USDC ≈ $1). Everywhere else uses the
 * real market value.
 */
function displayUsdValue(
  symbol: string,
  chainId: number,
  balance: number,
  marketValue: number,
): string {
  if (SEPOLIA_CHAIN_IDS.has(chainId) && USD_STABLECOINS.has(symbol.toUpperCase())) {
    // USDC ≈ $1 — show the balance as a 2-decimal dollar amount (e.g. $67.01).
    return formatUsdValue(balance);
  }
  return formatUsdValue(marketValue);
}

// =============================================================================
// EXCHANGE BALANCE TRANSFORMERS
// =============================================================================

/**
 * Transform Kraken account balances into TokenAsset[].
 *
 * Kraken balances use a different structure than wallet balances:
 * - `currency` instead of `symbol`
 * - Balances are in decimal (not smallest unit)
 * - No USD values or per-token prices from the API
 * - `logoURI` for token icons
 *
 * @param accounts - Kraken accounts from getKrakenAccounts()
 * @param options - Optional filters
 * @returns Array of TokenAsset objects
 */
export function transformKrakenToTokenAssets(
  accounts: Array<{
    id: string;
    balances: Array<{
      currency: string;
      balance: number;
      availableBalance?: number;
      logoURI?: string;
    }>;
  }>,
  options: TokenFilterOptions = {},
): TokenAsset[] {
  const { excludeZeroBalance = true } = options;
  const assets: TokenAsset[] = [];

  for (const account of accounts) {
    for (const balance of account.balances || []) {
      const available = balance.availableBalance ?? balance.balance;

      // Apply filters
      if (excludeZeroBalance && available <= 0) continue;

      // Try CoinGecko large variant first; store original as fallback.
      const iconUrl = balance.logoURI?.replace("/thumb/", "/large/");
      const iconUrlFallback = balance.logoURI;

      assets.push({
        id: `kraken-${balance.currency}`,
        name: balance.currency,
        symbol: balance.currency,
        balance: formatTokenBalance(available),
        rawBalance: String(available),
        // Exchange balances are already in human-readable decimal form (e.g. 1.5 USDC),
        // not in smallest-unit (wei/lamports). Setting decimals to 0 reflects this:
        // no scaling is needed, and 10^0 = 1 is a safe no-op if accidentally used
        // in conversion math. (Wallet tokens use real decimals like 6 or 18.)
        decimals: 0,
        usdValue: `${formatTokenBalance(available)} ${balance.currency}`,
        pricePerToken: 0,
        iconUrl,
        iconUrlFallback,
        chainId: 0, // Exchange-sourced, not on-chain
        tokenAddress: undefined,
      });
    }
  }

  // Sort alphabetically by symbol
  assets.sort((a, b) => a.symbol.localeCompare(b.symbol));

  return assets;
}

/**
 * Debug utility: Log all tokens from a balance response with filter info.
 * Useful for understanding why certain tokens are/aren't displayed.
 *
 * @param response - Response from getMultichainBalances
 * @param minUsdValue - Minimum USD value filter being applied
 */
export function logBalanceDebug(
  response: MultichainBalanceResponse | ChainBalance[] | unknown,
  minUsdValue: number,
): void {
  const chainBalances = normalizeBalanceResponse(response);
  const allTokens: Array<{
    Symbol: string;
    Network: number;
    Balance: string;
    "USD Value": string;
    "Shown?": string;
    "Filter Reason": string;
  }> = [];

  for (const chain of chainBalances) {
    for (const network of chain.networks || []) {
      for (const token of (network as NetworkBalance).balances || []) {
        const balance = parseFloat(token.balance || "0");
        const marketValue = parseFloat(token.marketValue || "0");

        let filterReason = "-";
        let shown = "✅ YES";

        if (balance <= 0) {
          filterReason = "zero balance";
          shown = "❌ NO";
        } else if (marketValue < minUsdValue) {
          filterReason = `marketValue ($${marketValue.toFixed(
            2,
          )}) < required ($${minUsdValue})`;
          shown = "❌ NO";
        }

        allTokens.push({
          Symbol: token.symbol || "???",
          Network: network.networkId,
          Balance: balance.toFixed(6),
          "USD Value": `$${marketValue.toFixed(2)}`,
          "Shown?": shown,
          "Filter Reason": filterReason,
        });
      }
    }
  }
}
