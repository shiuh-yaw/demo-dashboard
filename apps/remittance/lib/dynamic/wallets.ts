"use client";

import {
  getWalletAccounts as sdkGetWalletAccounts,
  type WalletAccount,
  type Chain,
} from "@dynamic-labs-sdk/client";
import {
  createWaasWalletAccounts as sdkCreateWaasWalletAccounts,
  exportWaasPrivateKey as sdkExportWaasPrivateKey,
  getChainsMissingWaasWalletAccounts as sdkGetChainsMissingWaasWalletAccounts,
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

export async function exportWaasPrivateKey(params: {
  walletAccount: WalletAccount;
  displayContainer: HTMLElement;
  password?: string;
}): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  if (!sdkIsWaasWalletAccount({ walletAccount: params.walletAccount })) {
    throw new Error(
      "This wallet is not a WaaS embedded wallet. Private key export is only available for embedded wallets.",
    );
  }

  return sdkExportWaasPrivateKey(
    {
      walletAccount: params.walletAccount,
      displayContainer: params.displayContainer,
      password: params.password,
    },
    client,
  );
}

export const isEvmWalletAccount = sdkIsEvmWalletAccount;

export type { WalletAccount, EvmWalletAccount, Chain };
