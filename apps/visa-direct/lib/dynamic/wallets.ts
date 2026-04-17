"use client";

import {
  getWalletAccounts as sdkGetWalletAccounts,
  type WalletAccount,
  type Chain,
} from "@dynamic-labs-sdk/client";
import { isWaasWalletAccount as sdkIsWaasWalletAccount } from "@dynamic-labs-sdk/client/waas";
import {
  isEvmWalletAccount as sdkIsEvmWalletAccount,
  type EvmWalletAccount,
} from "@dynamic-labs-sdk/evm";
import { createSafeWrapper, getClient } from "./client";

export const getWalletAccounts = createSafeWrapper(sdkGetWalletAccounts, []);

export const isEvmWalletAccount = sdkIsEvmWalletAccount;

/**
 * Wrapper around the SDK's `isWaasWalletAccount` that stays safe when
 * the client hasn't initialised yet (e.g. first render on the server).
 */
export function isWaasWalletAccount(params: {
  walletAccount: WalletAccount;
}): boolean {
  const client = getClient();
  if (!client) return false;
  try {
    return sdkIsWaasWalletAccount(params);
  } catch {
    // The WaaS extension is loaded lazily — if it hasn't registered
    // yet the SDK throws rather than returning false. Treat "unknown"
    // as "not a WaaS account" so the external-wallet resolver below
    // doesn't accidentally include it.
    return false;
  }
}

/**
 * The user's connected **external** (non-embedded) EVM wallet, or
 * `null` if none. Used by the connect-external-wallet modal to read
 * the address right after `connectAndVerifyWithWalletProvider`
 * resolves — the freshly-linked account shows up in
 * `getWalletAccounts()` and is distinguishable from the embedded
 * ZeroDev / WaaS accounts.
 */
export function getExternalEvmWalletAccount(): EvmWalletAccount | null {
  const accounts = getWalletAccounts();
  const external = accounts.find(
    (a) =>
      isEvmWalletAccount(a) &&
      !isWaasWalletAccount({ walletAccount: a }) &&
      !isZerodevWalletAccount(a),
  );
  return (external as EvmWalletAccount) ?? null;
}

/**
 * Matches the SDK-internal `isZerodevWalletAccount` (which isn't
 * re-exported from `@dynamic-labs-sdk/zerodev`): a wallet account is
 * a ZeroDev smart-wallet account iff its provider key starts with
 * the ZeroDev prefix. We need this because `getWalletAccounts()`
 * returns BOTH the WaaS EOA and its ZeroDev kernel overlay —
 * `sendUserOperation` / `createKernelClientForWalletAccount` only
 * accept the kernel entry, and passing the EOA throws
 * "Invalid smart wallet account".
 */
export function isZerodevWalletAccount(account: WalletAccount): boolean {
  return account.walletProviderKey?.toLowerCase().startsWith("zerodev") ?? false;
}

/**
 * Pick the best EVM account for transactional flows.
 *
 * Prefers the ZeroDev kernel account (needed for UserOperations and
 * gas-sponsored sends) and falls back to the EOA when ZeroDev isn't
 * enabled for the environment yet. This is the single resolver every
 * balance / signer / send code path should go through so we don't
 * accidentally split between two different on-chain addresses.
 */
export function getPrimarySmartEvmAccount(): EvmWalletAccount | null {
  const accounts = getWalletAccounts();
  const evmAccounts = accounts.filter((w): w is EvmWalletAccount =>
    isEvmWalletAccount(w),
  );
  return (
    evmAccounts.find(isZerodevWalletAccount) ??
    evmAccounts.find((w) => !!w.address) ??
    null
  );
}

/**
 * Create embedded WaaS wallet accounts via ZeroDev.
 * Uses dynamic imports so the waas/zerodev modules don't run module-level
 * code at startup and block Dynamic client initialization.
 */
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

  // Safe to call multiple times — ZeroDev checks internally
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
