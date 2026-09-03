"use client";

/**
 * Wallet accounts - the embedded (WaaS) EVM wallet and its ZeroDev wrapper.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-wallet-accounts
 */

import {
  connectAndVerifyWithWalletProvider as sdkConnectAndVerifyWithWalletProvider,
  getAvailableWalletProvidersData as sdkGetAvailableWalletProvidersData,
  getWalletAccounts as sdkGetWalletAccounts,
  type WalletAccount,
  type WalletProviderData,
} from "@dynamic-labs-sdk/client";
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

/** A browser or mobile wallet the user could link: the "bring your own" options (beat 2 curveball). */
export interface ExternalWalletOption {
  key: string;
  name: string;
  icon: string;
}

const isEmbeddedProviderKey = (key: string) => /dynamicwaas|zerodev|turnkey/i.test(key);

/**
 * Installed / reachable EVM wallet providers, minus the embedded ones. The
 * EVM extension discovers browser extensions (EIP-6963) and injected wallets;
 * the list is empty until the client has initialised.
 */
export function getExternalWalletOptions(): ExternalWalletOption[] {
  const client = getClient();
  if (!client) return [];
  let providers: WalletProviderData[] = [];
  try {
    providers = sdkGetAvailableWalletProvidersData();
  } catch {
    return [];
  }
  const seen = new Set<string>();
  return providers
    .filter((p) => p.chain === "EVM" && String(p.walletProviderType) !== "embeddedWallet" && !isEmbeddedProviderKey(p.key))
    .filter((p) => (seen.has(p.groupKey) ? false : (seen.add(p.groupKey), true)))
    .map((p) => ({ key: p.key, name: p.metadata.displayName, icon: p.metadata.icon }));
}

/**
 * Ask every EIP-6963 wallet in the page to announce itself again. The SDK's
 * listener stays registered for the life of the client, so a late-loading or
 * re-enabled extension lands in the registry without a reload.
 */
export function rescanExternalWallets(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

/** One line for the empty state: what the SDK registry holds and whether anything is injected. */
export function externalWalletDiagnostics(): string {
  const client = getClient();
  let keys: string[] = [];
  try {
    keys = sdkGetAvailableWalletProvidersData().map((p) => p.key);
  } catch {
    keys = [];
  }
  const injected = typeof window !== "undefined" && "ethereum" in window;
  return `SDK providers: ${keys.length ? keys.join(", ") : "none"} · window.ethereum ${injected ? "present" : "absent"} · client ${client?.initStatus ?? "not created"}`;
}

/**
 * Link an external wallet to the signed-in user: connect, then verify by
 * signature so it joins the user's wallet accounts (same session, same
 * policy surface as the embedded wallet).
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/connect-and-verify-with-wallet-provider
 */
export async function linkExternalWallet(walletProviderKey: string): Promise<WalletAccount> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkConnectAndVerifyWithWalletProvider({ walletProviderKey });
}

/** Any linked wallet that is not the embedded one - the "bring your own" wallet. */
export function getExternalWallet(): WalletAccount | undefined {
  return getWalletAccounts().find((w) => !isWaasWalletAccount(w) && !w.walletProviderKey.includes("zerodev"));
}
