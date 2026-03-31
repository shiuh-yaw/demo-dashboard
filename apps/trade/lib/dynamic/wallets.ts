"use client";

import {
  getWalletAccounts as sdkGetWalletAccounts,
  getPrimaryWalletAccount as sdkGetPrimaryWalletAccount,
  type WalletAccount,
  type Chain,
} from "@dynamic-labs-sdk/client";
import {
  createWaasWalletAccounts as sdkCreateWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts as sdkGetChainsMissingWaasWalletAccounts,
  isWaasWalletAccount as sdkIsWaasWalletAccount,
} from "@dynamic-labs-sdk/client/waas";
import {
  isEvmWalletAccount as sdkIsEvmWalletAccount,
  type EvmWalletAccount,
} from "@dynamic-labs-sdk/evm";
import { getClient, createSafeWrapper } from "./client";

export const getWalletAccounts = createSafeWrapper(sdkGetWalletAccounts, []);

export function getPrimaryWalletAccount(): WalletAccount | null {
  const client = getClient();
  if (!client) return null;
  try {
    return sdkGetPrimaryWalletAccount();
  } catch {
    return null;
  }
}

export async function createWaasWalletAccounts(params: {
  chains: Chain[];
}): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkCreateWaasWalletAccounts(params);
}

export function getChainsMissingWaasWalletAccounts(): Chain[] {
  const client = getClient();
  if (!client) return [];
  return sdkGetChainsMissingWaasWalletAccounts();
}

export function isWaasWalletAccount(params: {
  walletAccount: WalletAccount;
}): boolean {
  const client = getClient();
  if (!client) return false;
  return sdkIsWaasWalletAccount(params);
}

export const isEvmWalletAccount = sdkIsEvmWalletAccount;

export type { WalletAccount, EvmWalletAccount, Chain };
