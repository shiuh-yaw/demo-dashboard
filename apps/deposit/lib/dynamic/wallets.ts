"use client";

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
import { getClient, createSafeWrapper } from "./client";

export const getWalletAccounts = createSafeWrapper(sdkGetWalletAccounts, []);

export async function createWaasWalletAccounts(params: {
  chains: Chain[];
}): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkCreateWaasWalletAccounts(params);
}

export function isWaasWalletAccount(params: {
  walletAccount: WalletAccount;
}): boolean {
  const client = getClient();
  if (!client) return false;
  return sdkIsWaasWalletAccount(params);
}

export const isEvmWalletAccount = sdkIsEvmWalletAccount;

/** The user's connected external (non-embedded) EVM wallet, or `null` if none. */
export function getExternalEvmWalletAccount(): EvmWalletAccount | null {
  const accounts = getWalletAccounts();
  const external = accounts.find(
    (a) => isEvmWalletAccount(a) && !isWaasWalletAccount({ walletAccount: a }),
  );
  return (external as EvmWalletAccount) ?? null;
}

export type { WalletAccount, EvmWalletAccount, Chain };
