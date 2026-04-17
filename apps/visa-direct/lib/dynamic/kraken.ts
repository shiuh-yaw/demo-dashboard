"use client";

/**
 * Kraken Exchange Integration
 *
 * Thin SSR-safe wrappers around the Dynamic SDK's Kraken CeFi connector.
 * The user connects their Kraken account via OAuth
 * (`authenticateWithSocial({ provider: "kraken", ... })`), then we can read
 * balances and verify account identity for the payout demo.
 *
 * @see https://www.dynamic.xyz/docs/funding/kraken
 */

import {
  getKrakenAccounts as sdkGetKrakenAccounts,
  getUserSocialAccounts as sdkGetUserSocialAccounts,
  type KrakenAccount,
  type GetKrakenAccountsParams,
  type SocialAccount,
} from "@dynamic-labs-sdk/client";
import { getClient, createAsyncSafeWrapper } from "./client";

export const getKrakenAccounts = createAsyncSafeWrapper(sdkGetKrakenAccounts);

// ---------------------------------------------------------------------------
// Kraken deposit addresses
// ---------------------------------------------------------------------------

/**
 * Deposit address returned by Dynamic's Kraken proxy. Shape follows
 * Kraken's native `/0/private/DepositAddresses` response.
 */
export interface KrakenDepositAddress {
  /** Destination blockchain address. */
  address: string;
  /** Asset code, e.g. "USDC". */
  asset: string;
  /** Kraken deposit "method" — e.g. "USDC (Ethereum)". */
  method: string;
  /** Optional — Dynamic normalises the network keyword for convenience. */
  network?: string;
  /** Some chains (e.g. Solana memo, XRP tag) require this. */
  tag?: string;
  /** Unix timestamp (seconds) when the address expires, 0 if perpetual. */
  expireTime?: number;
  /** True when Kraken just minted a new address rather than reusing one. */
  isNew?: boolean;
}

export interface GetKrakenDepositAddressesParams {
  /** Asset code to deposit, e.g. "USDC". */
  asset: string;
  /**
   * Kraken deposit method string, e.g. "USDC (Ethereum)". Optional —
   * when omitted, Dynamic picks the best method for `networkKeyword`.
   */
  method?: string;
  /**
   * Human-readable network keyword (case-insensitive). If `method` is
   * omitted Dynamic uses this to select among multiple available
   * methods for the asset (e.g. "Ethereum" vs "Polygon").
   */
  networkKeyword?: string;
  /** Force generation of a fresh address rather than reusing one. */
  isNew?: boolean;
}

/**
 * Fetch (or generate) a Kraken deposit address for the authenticated
 * user. This calls Dynamic's server-side proxy for Kraken's
 * `/0/private/DepositAddresses` endpoint — Dynamic signs the request
 * with the user's Fast API Key internally (like it does for
 * `getKrakenAccounts` / `createKrakenExchangeTransfer`).
 *
 * When the Dynamic SDK exposes a native `getKrakenDepositAddresses()`
 * helper, swap the raw fetch below for the SDK call. The response
 * shape is expected to match `KrakenDepositAddress[]` — if Dynamic
 * wraps it differently we'll adjust the parse here only.
 */
export async function getKrakenDepositAddresses(
  params: GetKrakenDepositAddressesParams,
): Promise<KrakenDepositAddress[]> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  const token =
    (client as { token?: string | null }).token ??
    (client as { jwt?: string | null }).jwt ??
    null;
  if (!token) throw new Error("Not authenticated with Dynamic");

  const envId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  if (!envId) throw new Error("NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID missing");

  const res = await fetch(
    `https://app.dynamicauth.com/api/v0/sdk/${envId}/exchange/kraken/deposit-addresses`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asset: params.asset,
        method: params.method,
        networkKeyword: params.networkKeyword,
        new: params.isNew ?? false,
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Dynamic getKrakenDepositAddresses failed: ${res.status} ${text}`,
    );
  }

  const data = (await res.json()) as
    | KrakenDepositAddress[]
    | { addresses?: KrakenDepositAddress[] };
  // Accept either a bare array or an `{ addresses: [...] }` envelope —
  // we don't control Dynamic's final response shape.
  return Array.isArray(data) ? data : (data.addresses ?? []);
}

/**
 * Get all social accounts for the authenticated user.
 * Used to detect whether the user has already connected Kraken.
 */
export function getUserSocialAccounts(): SocialAccount[] {
  const client = getClient();
  if (!client) return [];
  try {
    return sdkGetUserSocialAccounts() ?? [];
  } catch {
    return [];
  }
}

/**
 * Whether the user has connected their Kraken account via Dynamic OAuth.
 */
export function isKrakenConnected(): boolean {
  return getUserSocialAccounts().some((a) => a.provider === "kraken");
}

/**
 * Returns the Kraken social account (with displayName / username) if
 * connected, otherwise null. Used for name-match verification against
 * the host's Dynamic profile.
 */
export function getKrakenSocialAccount(): SocialAccount | null {
  return getUserSocialAccounts().find((a) => a.provider === "kraken") ?? null;
}

export type { KrakenAccount, GetKrakenAccountsParams, SocialAccount };
// KrakenDepositAddress + GetKrakenDepositAddressesParams are exported
// as named interfaces above.
