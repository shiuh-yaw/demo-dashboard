"use client";

/**
 * The signing view of an account's wallets.
 *
 * Two different lists describe the same wallets, and the difference is the
 * whole point of the feature:
 *
 *   - `getBusinessAccount().wallets` is the ROSTER - every wallet the account
 *     owns, visible to any member including a viewer who can never sign.
 *   - `getWalletAccounts()` is what THIS session can act with. A business
 *     wallet only appears here once the signed-in user holds a share for it,
 *     and it carries `businessAccountId` to say which account owns it
 *     (personal wallets have no such field).
 *
 * So the roster answers "does the account have this wallet" and this answers
 * "can I send from it". A wallet on the roster with no match here belongs to
 * an account the user administers but cannot sign for - the admin/signer split
 * made concrete.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-wallet-accounts
 */

import {
  getWalletAccounts as sdkGetWalletAccounts,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { createSafeWrapper } from "./client";

export type { WalletAccount };

/** Every wallet this session can sign with, personal and business alike. */
export const getWalletAccounts = createSafeWrapper(sdkGetWalletAccounts, []);

/** The signable wallets belonging to one business account. */
export function signableWalletsFor(
  walletAccounts: readonly WalletAccount[],
  businessAccountId: string,
): WalletAccount[] {
  // 1.29.0 narrowed `businessAccountId` onto `WaasWalletAccount`; an external
  // wallet has no such field, and reading it off the union no longer typechecks.
  return walletAccounts.filter(
    (account) =>
      (account as { businessAccountId?: string }).businessAccountId ===
      businessAccountId,
  );
}

/**
 * The signable wallet matching a roster entry, by id then by address.
 *
 * Id is the reliable key; the address fallback covers a wallet the session
 * knows under a different record (the same key material can surface more than
 * once, e.g. a smart-account wrapper alongside its owner EOA).
 */
export function findSignableWallet(
  walletAccounts: readonly WalletAccount[],
  wallet: { id: string; publicKey?: string | null },
): WalletAccount | null {
  const byId = walletAccounts.find((account) => account.id === wallet.id);
  if (byId) return byId;

  const address = wallet.publicKey?.toLowerCase();
  if (!address) return null;
  return (
    walletAccounts.find(
      (account) => account.address.toLowerCase() === address,
    ) ?? null
  );
}
