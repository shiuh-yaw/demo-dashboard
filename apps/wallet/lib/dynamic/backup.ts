"use client";

/**
 * Key-share backup (Google Drive)
 *
 * Backs up the embedded wallet's user key share to the user's Google
 * Drive (app-data folder + personal Drive) via an MPC reshare ceremony.
 * Requires Google Drive backup enabled in the Dynamic dashboard and a
 * linked Google account with both Drive scopes granted - when scopes are
 * missing the SDK call rejects, and the UI re-links Google via
 * authenticateWithSocial to re-prompt consent.
 *
 * The live flow matches the docs' two layers (same steps the scenario
 * page's panel teaches): getGoogleDriveBackupReadiness pre-flight before
 * triggering the reshare, isInsufficientGoogleDriveScopesError recovery
 * after. Requires @dynamic-labs-sdk 1.x (the wallet direct-pins 1.19.1,
 * bypassing the workspace catalog's 0.25.0).
 *
 * @see https://www.dynamic.xyz/docs/javascript/wallets/embedded-wallets/mpc/google-drive-backup
 */

import {
  getGoogleDriveBackupReadiness as sdkGetGoogleDriveBackupReadiness,
  isInsufficientGoogleDriveScopesError,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { backupWaasKeySharesToGoogleDrive as sdkBackupWaasKeySharesToGoogleDrive } from "@dynamic-labs-sdk/client/waas";
import { getClient } from "./client";

/** Type guard for the scope-denied backup failure mode (pure, re-exported). */
export { isInsufficientGoogleDriveScopesError };

/**
 * Pre-flight: whether a Drive backup can succeed for the linked Google
 * account. "needs-access" means re-prompt Google consent first.
 */
export async function getGoogleDriveBackupReadiness(): Promise<{
  status: "ready" | "needs-access";
  missingScopes: readonly string[];
}> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkGetGoogleDriveBackupReadiness();
}

/**
 * Back up a WaaS wallet account's key share to Google Drive.
 * User must be authenticated with a linked Google account.
 */
export async function backupWaasKeySharesToGoogleDrive(params: {
  walletAccount: WalletAccount;
  password?: string;
}): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkBackupWaasKeySharesToGoogleDrive(params);
}

/**
 * Structural view of the backup records Dynamic persists on each
 * embedded-wallet credential. The user profile's
 * `verifiedCredentials[].walletProperties.keyShares[]` records where
 * every share is backed up (`backupLocation: "googleDrive" | "iCloud" |
 * "dynamic" | ...`) - it's what the legacy React SDK's useWalletBackup
 * reads for getWalletsBackupStatus. The JS SDK's WalletAccount mapper
 * drops it (parity gap, flagged to Dynamic), so read the raw credential.
 */
interface CredentialWithKeyShares {
  id?: string;
  walletProperties?: {
    keyShares?: { backupLocation?: string }[];
  };
}

/**
 * Sticky positive cache, keyed by verified-credential id (globally
 * unique, so safe across user switches). A backup never becomes undone,
 * but the evidence can vanish: not every user fetch carries
 * walletProperties.keyShares (the SDK's user-refresh returns a slimmer
 * profile than the login-time fetch and REPLACES client.user), so once
 * a wallet has been seen backed up - or backed up this session - keep it.
 */
const backedUpCredentialIds = new Set<string>();

/** Record a just-completed Drive backup (survives screen remounts). */
export function markWalletBackedUpToGoogleDrive(
  walletAccount: WalletAccount,
): void {
  if (walletAccount.verifiedCredentialId) {
    backedUpCredentialIds.add(walletAccount.verifiedCredentialId);
  }
}

/** True when the wallet's shares include a Google Drive backup record. */
export function isWalletBackedUpToGoogleDrive(
  walletAccount: WalletAccount,
): boolean {
  const credentialId = walletAccount.verifiedCredentialId;
  if (credentialId && backedUpCredentialIds.has(credentialId)) return true;

  const client = getClient();
  const credentials = (
    client?.user as
      | { verifiedCredentials?: CredentialWithKeyShares[] }
      | null
      | undefined
  )?.verifiedCredentials;
  const credential = credentials?.find(
    (cred) => cred.id === credentialId,
  );
  const backedUp = !!credential?.walletProperties?.keyShares?.some(
    (share) => share.backupLocation === "googleDrive",
  );
  if (backedUp && credentialId) backedUpCredentialIds.add(credentialId);
  return backedUp;
}
