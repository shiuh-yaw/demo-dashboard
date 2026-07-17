"use client";

/**
 * Wallet Balance
 *
 * Fetch native token balance and multichain token balances for wallet accounts.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-balance
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-multichain-balances
 */

import {
  getBalance as sdkGetBalance,
  getMultichainBalances as sdkGetMultichainBalances,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";
import { BASE_SEPOLIA_NETWORK_ID } from "@/lib/base-sepolia-tokens";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Token balance info returned by the multichain balance API.
 * Each entry represents a single token on a specific network.
 */
export interface TokenBalanceInfo {
  /** Token contract/mint address */
  address: string;
  /** Token name (e.g., "USD Coin") */
  name: string;
  /** Token symbol (e.g., "USDC") */
  symbol: string;
  /** Token decimals (e.g., 6 for USDC) */
  decimals: number;
  /** Token logo URL */
  logoURI: string;
  /** Human-readable balance (e.g., 1.5) */
  balance: number;
  /** Whether this is the network's native token */
  isNative?: boolean;
}

// =============================================================================
// NATIVE BALANCE
// =============================================================================

/**
 * Get the native token balance for a wallet account.
 * Returns the balance as a string (e.g., "1.5" ETH/SOL) or null if unavailable.
 *
 * @param walletAccount - The wallet account to get the balance for
 * @returns Object containing balance string or null
 *
 * @example
 * ```ts
 * const { balance } = await getBalance({ walletAccount });
 * if (balance) {
 *   console.log(`Balance: ${balance} ${networkData.nativeCurrency.symbol}`);
 * }
 * ```
 */
export async function getBalance(params: {
  walletAccount: WalletAccount;
}): Promise<{ balance: string | null }> {
  const client = getClient();
  if (!client) return { balance: null };

  try {
    return await sdkGetBalance(params);
  } catch {
    return { balance: null };
  }
}

// =============================================================================
// MULTICHAIN TOKEN BALANCES
// =============================================================================

/**
 * Get all token balances (native + tokens) for a wallet on a specific network.
 * Uses the Dynamic multichain balance API.
 *
 * @param address - Wallet address
 * @param chain - Chain type ("EVM" or "SOL")
 * @param networkId - Network ID to query (e.g., 1 for Ethereum, 103 for Solana devnet)
 * @returns Array of all balances including the native token
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-multichain-balances
 *
 * @example
 * ```ts
 * const tokens = await getTokenBalances({
 *   address: "0x...",
 *   chain: "EVM",
 *   networkId: 1,
 * });
 * // [{ symbol: "ETH", isNative: true, ... }, { symbol: "USDC", isNative: false, ... }]
 * ```
 */
export async function getTokenBalances({
  address,
  chain,
  networkId,
}: {
  address: string;
  chain: string;
  networkId: number;
}): Promise<TokenBalanceInfo[]> {
  const client = getClient();
  if (!client) return [];

  let sdkBalances: TokenBalanceInfo[] = [];
  try {
    const chainBalances = await sdkGetMultichainBalances({
      balanceRequest: {
        filterSpamTokens: true,
        balanceRequests: [
          {
            address,
            // TODO: Use ChainEnum directly once it's exported from @dynamic-labs-sdk/client
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            chain: chain as any,
            networkIds: [networkId],
          },
        ],
      },
    });

    sdkBalances =
      chainBalances?.flatMap((cb) =>
        (cb.networks ?? []).flatMap((n) => n.balances ?? []),
      ) ?? [];
  } catch {
    sdkBalances = [];
  }

  // Base Sepolia isn't covered by Dynamic's balances API, so its ERC-20
  // balances come from Alchemy via our server route (native ETH still
  // arrives from the SDK above). Merge, preferring the SDK entry when a
  // token appears in both.
  if (networkId === BASE_SEPOLIA_NETWORK_ID) {
    const alchemyBalances = await fetchBaseSepoliaTokenBalances(address);
    const seen = new Set(
      sdkBalances.map((b) => b.address.toLowerCase()),
    );
    return [
      ...sdkBalances,
      ...alchemyBalances.filter((b) => !seen.has(b.address.toLowerCase())),
    ];
  }

  return sdkBalances;
}

/**
 * Read Base Sepolia ERC-20 balances from our Alchemy-backed route.
 * Best-effort: any failure (missing key → 503, network error) yields an
 * empty list so the picker still shows whatever the SDK returned.
 */
async function fetchBaseSepoliaTokenBalances(
  address: string,
): Promise<TokenBalanceInfo[]> {
  const client = getClient();
  const token = (client as unknown as { token?: string | null })?.token;
  if (!token) return [];
  try {
    const res = await fetch(
      `/api/balances?address=${address}&networkId=${BASE_SEPOLIA_NETWORK_ID}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { balances?: TokenBalanceInfo[] };
    return data.balances ?? [];
  } catch {
    return [];
  }
}
