"use client";

/**
 * Wallet accounts - the embedded (WaaS) EVM wallet and its ZeroDev wrapper.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-wallet-accounts
 */

import { getWalletAccounts as sdkGetWalletAccounts, type WalletAccount } from "@dynamic-labs-sdk/client";
import {
  createWaasWalletAccounts as sdkCreateWaasWalletAccounts,
  isWaasWalletAccount as sdkIsWaasWalletAccount,
} from "@dynamic-labs-sdk/client/waas";
import { isEvmWalletAccount as sdkIsEvmWalletAccount, type EvmWalletAccount } from "@dynamic-labs-sdk/evm";
import { getClient, createSafeWrapper } from "./client";

export type { WalletAccount, EvmWalletAccount };

export const getWalletAccounts = createSafeWrapper(sdkGetWalletAccounts, [] as WalletAccount[]);

export const isEvmWalletAccount = sdkIsEvmWalletAccount;

export function isWaasWalletAccount(walletAccount: WalletAccount): boolean {
  const client = getClient();
  if (!client) return false;
  try {
    return sdkIsWaasWalletAccount({ walletAccount });
  } catch {
    return false;
  }
}

/**
 * Create the EVM embedded wallet. Called unconditionally right after a
 * successful sign-in per the SDK docs - the accounts list can be stale for a
 * moment after auth, so guarding on `length === 0` skips creation silently.
 * Creating for a user who already has one is a no-op.
 */
export async function ensureEvmWaasWallet(): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  const existing = getWalletAccounts().filter((w) => w.chain === "EVM" && isWaasWalletAccount(w));
  if (existing.length > 0) return;
  await sdkCreateWaasWalletAccounts({ chains: ["EVM"] });
}

/** The base (non-ZeroDev) embedded EVM wallet, if any. */
export function getEmbeddedEvmWallet(): EvmWalletAccount | undefined {
  return getWalletAccounts().find(
    (w) => isEvmWalletAccount(w) && isWaasWalletAccount(w) && !w.walletProviderKey.includes("zerodev"),
  ) as EvmWalletAccount | undefined;
}

/** The ZeroDev smart-account wrapper for the same address, if gas sponsorship is configured. */
export function getZerodevWalletFor(address: string): EvmWalletAccount | undefined {
  return getWalletAccounts().find(
    (w) =>
      isEvmWalletAccount(w) &&
      w.address.toLowerCase() === address.toLowerCase() &&
      w.walletProviderKey.includes("zerodev"),
  ) as EvmWalletAccount | undefined;
}

/** Any linked wallet that is not the embedded one - the "bring your own" wallet. */
export function getExternalWallet(): WalletAccount | undefined {
  return getWalletAccounts().find((w) => !isWaasWalletAccount(w) && !w.walletProviderKey.includes("zerodev"));
}
