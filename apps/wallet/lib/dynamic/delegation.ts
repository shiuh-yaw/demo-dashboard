"use client";

/**
 * MPC delegated access.
 *
 * Delegation hands our server one MPC share; Dynamic keeps the other. The
 * server can then sign for the user without the browser present, and neither
 * party can sign alone. Revocation is a reshare, so the share our server
 * stored becomes inert rather than merely flagged.
 *
 * @see https://www.dynamic.xyz/docs/javascript/wallets/embedded-wallets/mpc/delegated-access/triggering-delegation
 */

import {
  delegateWaasKeyShares as sdkDelegateWaasKeyShares,
  revokeWaasDelegation as sdkRevokeWaasDelegation,
} from "@dynamic-labs-sdk/client/waas";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

/**
 * Two shapes carry the same fact, and V3 wallets only use the second:
 *   keyShares[].backupLocation === "delegated"   (legacy)
 *   otherShareSets[].shareSetType === "delegated" (V3)
 *
 * The SDK's own `hasDelegatedAccess` reads only the first, so on a V3 wallet
 * it returns false forever while Dynamic's dashboard shows the wallet Active
 * and the delegation webhook has already fired. Confirmed against a live
 * session JWT: `keyShares` held one entry with `backupLocation: "dynamic"`
 * and the delegation sat in `otherShareSets` as `shareSetType: "delegated"`.
 */
export type DelegationShareShape = {
  keyShares?: { backupLocation?: string }[];
  otherShareSets?: { shareSetType?: string }[];
};

/** Pure, so both shapes can be tested against a real credential payload. */
export function isDelegatedShareShape(
  properties: DelegationShareShape | null | undefined,
): boolean {
  return Boolean(
    properties?.keyShares?.some((k) => k.backupLocation === "delegated") ||
      properties?.otherShareSets?.some((s) => s.shareSetType === "delegated"),
  );
}

/**
 * Whether Dynamic considers this wallet delegated. Synchronous - safe to call
 * during render. Says nothing about whether OUR server has stored the
 * materials yet; the webhook lands separately.
 */
export function hasDelegatedAccess(walletAccount: WalletAccount): boolean {
  const client = getClient();
  if (!client) return false;
  // Join on verifiedCredentialId - the SDK derives wallet accounts from these
  // credentials, so it is exact where an address match is merely unambiguous.
  const credential = client.user?.verifiedCredentials?.find(
    (c) => c.id === walletAccount.verifiedCredentialId,
  );
  // Matches the SDK's assertDefined: a failed lookup is a real problem and
  // must not read as "not delegated". The screen catches and surfaces it.
  if (!credential) {
    throw new Error("Verified credential not found for WaaS wallet account");
  }
  return isDelegatedShareShape(
    credential.walletProperties as DelegationShareShape | undefined,
  );
}

/** Trigger delegation. Resolves when the reshare completes, NOT when our server has the share. */
export async function delegateWaasKeyShares(
  walletAccount: WalletAccount,
): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkDelegateWaasKeyShares({ walletAccount });
}

/** Revoke delegation. Reshares the key, invalidating the server's stored share. */
export async function revokeWaasDelegation(
  walletAccount: WalletAccount,
): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkRevokeWaasDelegation({ walletAccount });
}
