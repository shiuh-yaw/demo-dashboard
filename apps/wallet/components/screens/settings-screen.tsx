"use client";

import { useRef, useState } from "react";
import { CheckCircle2, CloudUpload, FileDown, KeyRound } from "lucide-react";
import {
  WidgetCard,
  Button,
  ScrollableWithFade,
  Spinner,
  Tooltip,
} from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { useSocialAuth } from "@/hooks/use-mutations";
import {
  backupWaasKeySharesToGoogleDrive,
  exportWaasClientKeyshares,
  exportWaasPrivateKey,
  getGoogleDriveBackupReadiness,
  hasDownloadedShare,
  isInsufficientGoogleDriveScopesError,
  isWalletBackedUpToGoogleDrive,
  markShareDownloaded,
  markWalletBackedUpToGoogleDrive,
} from "@/lib/dynamic";
import { getUniqueWalletAddresses } from "@/lib/wallet-utils";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface SettingsScreenProps {
  navigation: NavigationReturn;
}

type BackupState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "done" }
  | { status: "error"; error: unknown };

/**
 * Settings screen - key-share backup and export per wallet: back up to
 * Google Drive, download the client share as a file (offline export),
 * or reveal the private key in an SDK-injected secure iframe (the key
 * never passes through app code).
 *
 * The backup runs the docs' two-layer flow (mirrored in the scenario
 * page's panel): getGoogleDriveBackupReadiness pre-flight - "needs-
 * access" routes to the connect-Google card without starting an MPC
 * reshare that can't finish - and isInsufficientGoogleDriveScopesError
 * post-flight for the legacy-token case. Everything else (e.g. Drive
 * API disabled in the Google Cloud project) surfaces its actionable
 * message in the error card, since re-consenting can't fix it. The
 * common trap either way: Google shows the two Drive permissions as
 * UNCHECKED opt-in boxes on the consent screen.
 */
export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { walletAccounts, isLoading } = useWalletAccounts();
  const socialAuth = useSocialAuth();
  // Q-017: while settings is up, the code panel shows the backup steps.
  usePanelSectionEffect("settings");

  const [backups, setBackups] = useState<Record<string, BackupState>>({});
  const [exportErrors, setExportErrors] = useState<Record<string, unknown>>(
    {},
  );
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  // Always-mounted per-row containers so the SDK can inject its secure
  // iframe synchronously on click (no wait for a state-driven mount).
  const revealContainers = useRef(new Map<string, HTMLDivElement>());

  const uniqueWallets = getUniqueWalletAddresses(walletAccounts);
  // A transient SDK hiccup (e.g. useGetWalletAccounts refetching on a
  // client event) can momentarily yield an empty accounts list - keep
  // the last non-empty one so the screen never flashes "No wallets"
  // while wallets exist.
  const lastWalletsRef = useRef(uniqueWallets);
  if (uniqueWallets.length > 0) lastWalletsRef.current = uniqueWallets;
  const wallets =
    uniqueWallets.length > 0 ? uniqueWallets : lastWalletsRef.current;
  const [needsGoogleLink, setNeedsGoogleLink] = useState(false);

  const setBackup = (address: string, state: BackupState) =>
    setBackups((prev) => ({ ...prev, [address]: state }));
  const setExportError = (address: string, error: unknown) =>
    setExportErrors((prev) => ({ ...prev, [address]: error }));

  const handleBackup = async (
    address: string,
    walletAccount: (typeof uniqueWallets)[number]["walletAccount"],
  ) => {
    setBackup(address, { status: "pending" });
    try {
      // Layer 1: pre-flight - when Drive access is missing, route to the
      // connect card instead of starting an MPC reshare that can't
      // finish its upload.
      const readiness = await getGoogleDriveBackupReadiness();
      if (readiness.status === "needs-access") {
        setBackup(address, { status: "idle" });
        setNeedsGoogleLink(true);
        return;
      }
      await backupWaasKeySharesToGoogleDrive({ walletAccount });
      setBackup(address, { status: "done" });
      // Sticky session cache so remounts keep showing "Backed up".
      // Deliberately no user re-fetch here: the SDK's refresh returns a
      // slimmer profile (no keyShares records) and replaces client.user,
      // which would wipe other wallets' persisted backup evidence.
      markWalletBackedUpToGoogleDrive(walletAccount);
    } catch (error) {
      // Layer 2: legacy links without recorded scopes pass pre-flight
      // but fail the upload - same recovery path.
      if (isInsufficientGoogleDriveScopesError(error)) {
        setBackup(address, { status: "idle" });
        setNeedsGoogleLink(true);
        return;
      }
      setBackup(address, { status: "error", error });
    }
  };

  const handleDownloadShare = async (
    address: string,
    walletAccount: (typeof uniqueWallets)[number]["walletAccount"],
  ) => {
    setExportError(address, undefined);
    setDownloading(address);
    try {
      // Offline export: saves the client key share as a file (base64).
      await exportWaasClientKeyshares({ walletAccount });
      // Dynamic doesn't record client-side exports - persist the fact
      // to user metadata ourselves (best-effort).
      markShareDownloaded(walletAccount).catch(() => {});
      setDownloaded((prev) => ({ ...prev, [address]: true }));
    } catch (error) {
      setExportError(address, error);
    } finally {
      setDownloading(null);
    }
  };

  const handleRevealKey = async (
    address: string,
    walletAccount: (typeof uniqueWallets)[number]["walletAccount"],
  ) => {
    const container = revealContainers.current.get(address);
    if (!container) return;
    setExportError(address, undefined);
    // One reveal at a time - clear any other open frame.
    for (const [addr, el] of revealContainers.current) {
      if (addr !== address) el.replaceChildren();
    }
    container.replaceChildren();
    setRevealedFor(address);
    try {
      await exportWaasPrivateKey({ walletAccount, displayContainer: container });
    } catch (error) {
      setRevealedFor(null);
      setExportError(address, error);
    }
  };

  const hideRevealedKey = () => {
    if (revealedFor) {
      revealContainers.current.get(revealedFor)?.replaceChildren();
    }
    setRevealedFor(null);
  };

  return (
    <WidgetCard
      onBack={() => navigation.goToDashboard()}
      title="Settings"
      subtitle="Backup & recovery"
    >
      <div className="space-y-4">
        {/* No section heading: the card subtitle ("Backup & recovery")
            already names this screen's single section. */}
        <div>
          <p className="text-xs leading-relaxed text-(--brand-muted)">
            Two ways to recover a wallet: back up an encrypted key share
            to Google Drive, or download the share as a file you keep. On
            Google&apos;s consent screen, tick{" "}
            <span className="font-medium">both</span> Drive permissions.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : wallets.length === 0 ? (
          <p className="py-4 text-center text-sm text-(--brand-muted)">
            No wallets yet - create one first.
          </p>
        ) : (
          // Same capped-height scroll treatment as the dashboard's
          // wallet list - the settings card shouldn't grow with wallets.
          <ScrollableWithFade contentClassName="space-y-2">
            {wallets.map(({ address, chain, walletAccount }) => {
              const state = backups[address] ?? { status: "idle" };
              // Persisted record from the user profile survives reloads;
              // the local map covers the just-backed-up case instantly.
              const isBackedUp =
                state.status === "done" ||
                isWalletBackedUpToGoogleDrive(walletAccount);
              const isDownloaded =
                downloaded[address] || hasDownloadedShare(walletAccount);
              const exportError = exportErrors[address];
              const isRevealed = revealedFor === address;
              return (
                <div
                  key={address}
                  className="rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-(--brand-fg)">
                        {truncateAddress(address)}
                      </p>
                      <p className="text-xs text-(--brand-muted)">{chain}</p>
                    </div>
                    {/* One action group, fixed order: backup action/state
                        far left, then export - key rightmost. Three
                        states: [Back up] -> [check chip + Download
                        share] -> one combined [Backed up] button
                        (re-download on click; tooltip explains).
                        Download only exists post-backup - a share file
                        downloaded before the backup's reshare would go
                        stale. Reveal key is always available (the key
                        never changes). */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isBackedUp && isDownloaded ? (
                        <Tooltip content="Download the share again">
                          <Button
                            variant="outline"
                            size="sm"
                            loading={downloading === address}
                            onClick={() =>
                              handleDownloadShare(address, walletAccount)
                            }
                          >
                            {downloading !== address && (
                              <CheckCircle2
                                className="h-4 w-4"
                                strokeWidth={1.5}
                                aria-hidden
                              />
                            )}
                            Backed up
                          </Button>
                        </Tooltip>
                      ) : isBackedUp ? (
                        <>
                          <Tooltip content="Backed up to Google Drive">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--brand-border) bg-(--brand-surface) text-(--brand-fg)">
                              <CheckCircle2
                                className="h-4 w-4"
                                strokeWidth={1.5}
                                aria-hidden
                              />
                            </span>
                          </Tooltip>
                          <Tooltip content="Save the key share as a file">
                            <Button
                              variant="outline"
                              size="sm"
                              loading={downloading === address}
                              onClick={() =>
                                handleDownloadShare(address, walletAccount)
                              }
                            >
                              {downloading !== address && (
                                <FileDown
                                  className="h-4 w-4"
                                  strokeWidth={1.5}
                                  aria-hidden
                                />
                              )}
                              Download share
                            </Button>
                          </Tooltip>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          loading={state.status === "pending"}
                          onClick={() => handleBackup(address, walletAccount)}
                        >
                          {state.status !== "pending" && (
                            <CloudUpload
                              className="h-4 w-4"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                          )}
                          Back up
                        </Button>
                      )}
                      <Tooltip
                        content={
                          isRevealed ? "Hide private key" : "Reveal private key"
                        }
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2"
                          onClick={() =>
                            isRevealed
                              ? hideRevealedKey()
                              : handleRevealKey(address, walletAccount)
                          }
                          aria-label={
                            isRevealed
                              ? "Hide private key"
                              : "Reveal private key"
                          }
                        >
                          <KeyRound
                            className="h-4 w-4"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                  {/* SDK-injected secure iframe lands in the inner div.
                      The wrapper stays mounted (hidden) so the container
                      exists synchronously on click; iframe height needs
                      the important modifier - the SDK sets its own. */}
                  <div className={isRevealed ? "mt-2.5 space-y-1.5" : "hidden"}>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-(--brand-muted)">
                        Private key
                      </p>
                      <button
                        type="button"
                        onClick={hideRevealedKey}
                        className="text-[11px] font-medium text-(--brand-muted) transition-colors hover:text-(--brand-fg)"
                      >
                        Hide
                      </button>
                    </div>
                    <div
                      ref={(el) => {
                        if (el) revealContainers.current.set(address, el);
                        else revealContainers.current.delete(address);
                      }}
                      className="h-28 overflow-hidden rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-surface) p-3 [&_iframe]:block [&_iframe]:w-full!"
                    />
                    <p className="text-[11px] leading-relaxed text-(--brand-muted)">
                      Anyone with this key controls the wallet. Never share
                      it or paste it anywhere you don&apos;t fully trust.
                    </p>
                  </div>
                  {state.status === "error" ? (
                    <ErrorMessage
                      error={state.error}
                      defaultMessage="Backup failed. Please try again."
                      className="mt-2"
                    />
                  ) : null}
                  {exportError ? (
                    <ErrorMessage
                      error={exportError}
                      defaultMessage="Export failed. Please try again."
                      className="mt-2"
                    />
                  ) : null}
                </div>
              );
            })}
          </ScrollableWithFade>
        )}

        {needsGoogleLink ? (
          <div className="rounded-(--brand-radius) border border-(--brand-border) p-3">
            <p className="text-xs leading-relaxed text-(--brand-muted)">
              Backups need a Google account with Drive access. Connect
              Google and tick both Drive permissions on the consent screen,
              then back up again.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              loading={socialAuth.isPending}
              onClick={() => socialAuth.mutate("google")}
            >
              Connect Google Drive
            </Button>
          </div>
        ) : null}
      </div>
    </WidgetCard>
  );
}
