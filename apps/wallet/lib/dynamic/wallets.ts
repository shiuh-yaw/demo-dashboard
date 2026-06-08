"use client";

/**
 * Wallet Accounts
 *
 * Create and query embedded (WaaS) wallet accounts.
 * Includes type guards for chain-specific wallet checks.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-wallet-accounts
 */

import {
  getWalletAccounts as sdkGetWalletAccounts,
  type WalletAccount,
  type Chain,
} from "@dynamic-labs-sdk/client";
import {
  createWaasWalletAccounts as sdkCreateWaasWalletAccounts,
  isWaasWalletAccount as sdkIsWaasWalletAccount,
} from "@dynamic-labs-sdk/client/waas";
import {
  isEvmWalletAccount as sdkIsEvmWalletAccount,
  type EvmWalletAccount,
} from "@dynamic-labs-sdk/evm";
import {
  isSolanaWalletAccount as sdkIsSolanaWalletAccount,
  type SolanaWalletAccount,
} from "@dynamic-labs-sdk/solana";
import {
  isSuiWalletAccount as sdkIsSuiWalletAccount,
  type SuiWalletAccount,
} from "@dynamic-labs-sdk/sui";
import {
  isBitcoinWalletAccount as sdkIsBitcoinWalletAccount,
  type BitcoinWalletAccount,
} from "@dynamic-labs-sdk/bitcoin";
import {
  isAptosWalletAccount as sdkIsAptosWalletAccount,
  type AptosWalletAccount,
} from "@dynamic-labs-sdk/aptos";
import {
  isTronWalletAccount as sdkIsTronWalletAccount,
  type TronWalletAccount,
} from "@dynamic-labs-sdk/tron";
import {
  isStarknetWalletAccount as sdkIsStarknetWalletAccount,
  type StarknetWalletAccount,
} from "@dynamic-labs-sdk/starknet";
import {
  isTonWalletAccount as sdkIsTonWalletAccount,
  type TonWalletAccount,
} from "@dynamic-labs-sdk/ton";
import { getClient, createSafeWrapper } from "./client";

/**
 * Get all wallet accounts for the current user.
 * Returns empty array during SSR.
 */
export const getWalletAccounts = createSafeWrapper(sdkGetWalletAccounts, []);

/**
 * Create new WaaS (embedded) wallet accounts.
 * User must be authenticated.
 */
export async function createWaasWalletAccounts(params: {
  chains: Chain[];
}): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkCreateWaasWalletAccounts(params);
}

/**
 * Check if a wallet account is a WaaS (embedded) wallet.
 * Returns false during SSR.
 */
export function isWaasWalletAccount(params: {
  walletAccount: WalletAccount;
}): boolean {
  const client = getClient();
  if (!client) return false;
  return sdkIsWaasWalletAccount(params);
}

// =============================================================================
// CHAIN TYPE GUARDS
// These are pure functions that check wallet account types.
// Safe to use directly - they don't require client instance.
// =============================================================================

/** Check if wallet account is EVM-compatible */
export const isEvmWalletAccount = sdkIsEvmWalletAccount;

/** Check if wallet account is Solana */
export const isSolanaWalletAccount = sdkIsSolanaWalletAccount;

/** Check if wallet account is SUI */
export const isSuiWalletAccount = sdkIsSuiWalletAccount;

/** Check if wallet account is Bitcoin */
export const isBitcoinWalletAccount = sdkIsBitcoinWalletAccount;

/** Check if wallet account is Aptos */
export const isAptosWalletAccount = sdkIsAptosWalletAccount;

/** Check if wallet account is Tron */
export const isTronWalletAccount = sdkIsTronWalletAccount;

/** Check if wallet account is Starknet */
export const isStarknetWalletAccount = sdkIsStarknetWalletAccount;

/** Check if wallet account is TON */
export const isTonWalletAccount = sdkIsTonWalletAccount;

export type {
  WalletAccount,
  EvmWalletAccount,
  SolanaWalletAccount,
  SuiWalletAccount,
  BitcoinWalletAccount,
  AptosWalletAccount,
  TronWalletAccount,
  StarknetWalletAccount,
  TonWalletAccount,
  Chain,
};
