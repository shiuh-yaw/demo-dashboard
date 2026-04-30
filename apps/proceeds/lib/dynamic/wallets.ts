"use client";

import {
  getWalletAccounts as sdkGetWalletAccounts,
  getPrimaryWalletAccount as sdkGetPrimaryWalletAccount,
  type WalletAccount,
  type Chain,
} from "@dynamic-labs-sdk/client";
import {
  isEvmWalletAccount as sdkIsEvmWalletAccount,
  type EvmWalletAccount,
} from "@dynamic-labs-sdk/evm";
import { getClient, createSafeWrapper } from "./client";

export const getWalletAccounts = createSafeWrapper(sdkGetWalletAccounts, []);
export const getPrimaryWalletAccount = createSafeWrapper(sdkGetPrimaryWalletAccount, null);
export const isEvmWalletAccount = sdkIsEvmWalletAccount;

/**
 * Returns the base (non-ZeroDev) EVM WaaS wallet account.
 *
 * The ZeroDev kernel wallet doesn't own a network — it follows the base
 * wallet — so network operations (`getActiveNetworkData`,
 * `switchActiveNetwork`) and signing must target the base WaaS account.
 * Falling back to the first EVM account preserves behavior when ZeroDev
 * hasn't been registered yet.
 */
export function getEvmWalletAccount(): EvmWalletAccount | null {
  const accounts = getWalletAccounts();
  const evmAccounts = accounts.filter((a) => isEvmWalletAccount(a));
  const base = evmAccounts.find(
    (a) => !a.walletProviderKey?.toLowerCase().includes("zerodev"),
  );
  return ((base ?? evmAccounts[0]) as EvmWalletAccount) ?? null;
}

/**
 * Returns all EVM wallet accounts (base + ZeroDev kernel) for an address.
 * Used when an operation must be applied to every wallet sharing an address
 * — e.g. EIP-7702 setups where base and kernel resolve to the same address.
 */
export function getEvmWalletAccountsForAddress(
  address: string,
): EvmWalletAccount[] {
  const accounts = getWalletAccounts();
  return accounts.filter(
    (a) =>
      isEvmWalletAccount(a) &&
      a.address.toLowerCase() === address.toLowerCase(),
  ) as EvmWalletAccount[];
}

/**
 * Get the ZeroDev smart wallet account for EVM transactions.
 * When the ZeroDev extension is registered, the SDK exposes a wrapped
 * smart-contract account alongside the base WaaS account — `sendUserOperation`
 * and `createKernelClientForWalletAccount` require the ZeroDev one.
 */
export function getSmartWalletAccount(): EvmWalletAccount | null {
  const accounts = getWalletAccounts();
  const zd = accounts.find(
    (a) =>
      isEvmWalletAccount(a) &&
      a.walletProviderKey?.toLowerCase().includes("zerodev"),
  );
  return (zd as EvmWalletAccount) ?? null;
}

export async function createWaasWalletAccounts(params: {
  chains: Chain[];
}): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  const [{ addZerodevExtension }, { createWaasWalletAccounts: sdkCreate }] =
    await Promise.all([
      import("@dynamic-labs-sdk/zerodev"),
      import("@dynamic-labs-sdk/client/waas"),
    ]);
  addZerodevExtension(client);
  return sdkCreate(params);
}

export async function getChainsMissingWaasWalletAccounts(): Promise<Chain[]> {
  const client = getClient();
  if (!client) return [];
  const [{ addZerodevExtension }, { getChainsMissingWaasWalletAccounts: sdkGet }] =
    await Promise.all([
      import("@dynamic-labs-sdk/zerodev"),
      import("@dynamic-labs-sdk/client/waas"),
    ]);
  addZerodevExtension(client);
  return sdkGet();
}

export type { WalletAccount, EvmWalletAccount, Chain };
