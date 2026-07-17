"use client";

/**
 * Private-key export (secure reveal)
 *
 * Reveals a WaaS wallet account's private key inside an SDK-injected
 * iframe: you hand the SDK a container element and Dynamic renders the
 * key in it, so the key never passes through application code. Pass a
 * password when the key share was password-encrypted.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/waas/exporting-waas-private-key
 */

import { updateUser, type WalletAccount } from "@dynamic-labs-sdk/client";
import {
  exportWaasClientKeyshares as sdkExportWaasClientKeyshares,
  exportWaasPrivateKey as sdkExportWaasPrivateKey,
} from "@dynamic-labs-sdk/client/waas";
import { getClient } from "./client";

/** Reveal a wallet's private key inside `displayContainer`. */
export async function exportWaasPrivateKey(params: {
  walletAccount: WalletAccount;
  displayContainer: HTMLElement;
  password?: string;
}): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkExportWaasPrivateKey(params);
}

/**
 * Offline export: save the client key share as a file on the user's
 * device (the MPC glossary's "Export Share" - base64 encoded). In the
 * SDK but not yet in the JS SDK docs, so the panel teaches the
 * documented private-key reveal instead.
 */
export async function exportWaasClientKeyshares(params: {
  walletAccount: WalletAccount;
  password?: string;
}): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkExportWaasClientKeyshares(params);
}

// =============================================================================
// SHARE-DOWNLOAD TRACKING
// Dynamic doesn't record offline exports (they're client-side), so the
// app tracks them itself in the user's Dynamic metadata - the repo's
// blessed store for user state (survives devices, visible to operators
// on the user profile). Mirrors the backup module's sticky-cache
// pattern so a slim profile fetch can't erase the evidence mid-session.
// =============================================================================

const SHARES_DOWNLOADED_KEY = "sharesDownloaded";

/** credentialId -> ISO timestamp of the last share download. */
type SharesDownloaded = Record<string, string>;

const downloadedCredentialIds = new Set<string>();

function readSharesDownloaded(): SharesDownloaded {
  const client = getClient();
  const metadata = (client?.user?.metadata ?? {}) as Record<string, unknown>;
  const value = metadata[SHARES_DOWNLOADED_KEY];
  return value && typeof value === "object"
    ? (value as SharesDownloaded)
    : {};
}

/** True when this wallet's share was downloaded (any device, any time). */
export function hasDownloadedShare(walletAccount: WalletAccount): boolean {
  const credentialId = walletAccount.verifiedCredentialId;
  if (!credentialId) return false;
  if (downloadedCredentialIds.has(credentialId)) return true;
  const downloaded = credentialId in readSharesDownloaded();
  if (downloaded) downloadedCredentialIds.add(credentialId);
  return downloaded;
}

/** Persist a completed share download to the user's Dynamic metadata. */
export async function markShareDownloaded(
  walletAccount: WalletAccount,
): Promise<void> {
  const credentialId = walletAccount.verifiedCredentialId;
  if (!credentialId) return;
  downloadedCredentialIds.add(credentialId);
  const client = getClient();
  if (!client?.user) return;
  const metadata = (client.user.metadata ?? {}) as Record<string, unknown>;
  await updateUser({
    userFields: {
      metadata: {
        ...metadata,
        [SHARES_DOWNLOADED_KEY]: {
          ...readSharesDownloaded(),
          [credentialId]: new Date().toISOString(),
        },
      },
    },
  });
}
