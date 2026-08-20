"use client";

/**
 * Key-share backup and offline export for ONE wallet.
 *
 * The Google flow is checked twice. `getGoogleDriveBackupReadiness` pre-flight
 * keeps a missing grant from starting an MPC reshare that cannot finish its
 * upload; `isInsufficientGoogleDriveScopesError` post-flight catches links made
 * before scopes were recorded. Both route to the connect card. Anything else
 * (Drive API off in the Google project) surfaces as an error, since
 * re-consenting cannot fix it.
 *
 * The trap in both cases: Google shows the two Drive permissions as UNCHECKED
 * opt-in boxes on the consent screen.
 */

import { useCallback, useState } from "react";
import { useTrack } from "@dynamic-demos/analytics";
import { trackedBackup } from "@/lib/analytics/flows";
import {
  backupWaasKeySharesToGoogleDrive,
  exportWaasClientKeyshares,
  getGoogleDriveBackupReadiness,
  hasDownloadedShare,
  isInsufficientGoogleDriveScopesError,
  isWalletBackedUpToGoogleDrive,
  markShareDownloaded,
  markWalletBackedUpToGoogleDrive,
  type WalletAccount,
} from "@/lib/dynamic";

export interface WalletBackup {
  isBackedUp: boolean;
  isDownloaded: boolean;
  isBackingUp: boolean;
  isDownloading: boolean;
  /** Drive access is missing, so connecting Google is the only way forward. */
  needsGoogleLink: boolean;
  error: unknown;
  backUp: () => Promise<void>;
  downloadShare: () => Promise<void>;
}

export function useWalletBackup(walletAccount: WalletAccount): WalletBackup {
  const { milestone } = useTrack();
  const [backedUp, setBackedUp] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isBackingUp, setBackingUp] = useState(false);
  const [isDownloading, setDownloading] = useState(false);
  const [needsGoogleLink, setNeedsGoogleLink] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const backUp = useCallback(async () => {
    setError(undefined);
    setBackingUp(true);
    try {
      const readiness = await getGoogleDriveBackupReadiness();
      if (readiness.status === "needs-access") {
        setNeedsGoogleLink(true);
        return;
      }
      // backup_completed fires only once the reshare and upload resolve.
      await trackedBackup(milestone, () =>
        backupWaasKeySharesToGoogleDrive({ walletAccount }),
      );
      setBackedUp(true);
      // No user re-fetch here: the SDK's refresh returns a slimmer profile
      // without keyShares and would wipe other wallets' backup evidence.
      markWalletBackedUpToGoogleDrive(walletAccount);
    } catch (caught) {
      if (isInsufficientGoogleDriveScopesError(caught)) {
        setNeedsGoogleLink(true);
        return;
      }
      setError(caught);
    } finally {
      setBackingUp(false);
    }
  }, [milestone, walletAccount]);

  const downloadShare = useCallback(async () => {
    setError(undefined);
    setDownloading(true);
    try {
      await exportWaasClientKeyshares({ walletAccount });
      // Dynamic does not record client-side exports, so persist it ourselves.
      markShareDownloaded(walletAccount).catch(() => {});
      setDownloaded(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setDownloading(false);
    }
  }, [walletAccount]);

  return {
    // The persisted record survives reloads; local state covers the
    // just-finished case before the profile catches up.
    isBackedUp: backedUp || isWalletBackedUpToGoogleDrive(walletAccount),
    isDownloaded: downloaded || hasDownloadedShare(walletAccount),
    isBackingUp,
    isDownloading,
    needsGoogleLink,
    error,
    backUp,
    downloadShare,
  };
}
