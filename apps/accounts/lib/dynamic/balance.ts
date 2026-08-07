"use client";

/**
 * What a wallet holds - native currency and tokens.
 *
 * Two calls because they read from different places: `getNativeBalance` goes
 * to the chain's RPC, `getTokenBalances` to Dynamic's indexed API. Both are
 * used on the same screen, so a token balance can be present while the native
 * one is still loading, and vice versa.
 *
 * `getBalance` is the deprecated spelling of `getNativeBalance` in this SDK
 * version; the new name is used here so the code panel teaches the current
 * surface.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-balance
 */

import {
  getNativeBalance as sdkGetNativeBalance,
  getTokenBalances as sdkGetTokenBalances,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

/** One token a wallet holds, flattened to what a picker and a row need. */
export interface TokenBalance {
  /** Contract / mint address. Absent for the chain's native currency. */
  address?: string;
  symbol: string;
  name?: string;
  decimals: number;
  /** Already scaled to a human amount. */
  balance: number;
  logoUrl?: string;
  isNative: boolean;
}

/**
 * Native balance as a decimal string, or null when it cannot be read.
 *
 * Swallows the failure on purpose: a balance is decoration on a screen whose
 * job is to send, and an RPC hiccup must not replace the send form with an
 * error card. The UI renders a dash instead.
 */
export async function getNativeBalance(params: {
  walletAccount: WalletAccount;
}): Promise<string | null> {
  if (!getClient()) return null;
  try {
    const { balance } = await sdkGetNativeBalance(params);
    return balance;
  } catch {
    return null;
  }
}

/**
 * Tokens held on the wallet's active network, native first.
 *
 * `includeNative` folds the gas currency into the same list so the asset
 * picker has one source rather than stitching two together.
 */
export async function getTokenBalances(params: {
  walletAccount: WalletAccount;
  networkId?: number;
}): Promise<TokenBalance[]> {
  if (!getClient()) return [];

  try {
    const balances = await sdkGetTokenBalances({
      walletAccount: params.walletAccount,
      networkId: params.networkId,
      includeNative: true,
      // Spam filtering off and the cache bypassed, because the wallets this
      // demo runs on are testnet wallets: testnet USDC gets flagged by
      // reputation heuristics that only really work on mainnet, and a token
      // received minutes ago is still missing from the cached response.
      // Between them, a wallet visibly holding 100 USDC offered only ETH.
      filterSpamTokens: false,
      forceRefresh: true,
    });

    return balances.flatMap((token) => {
      // A token with no symbol cannot be labelled in a picker, and one with no
      // decimals cannot be converted to base units for a transfer - either way
      // it is not something this screen can act on.
      if (!token.symbol || token.decimals == null) return [];
      return [
        {
          address: token.address ?? undefined,
          symbol: token.symbol,
          name: token.name ?? undefined,
          decimals: token.decimals,
          balance: Number(token.balance ?? 0),
          logoUrl: token.logoURI ?? undefined,
          isNative: Boolean(token.isNative),
        },
      ];
    });
  } catch {
    return [];
  }
}
