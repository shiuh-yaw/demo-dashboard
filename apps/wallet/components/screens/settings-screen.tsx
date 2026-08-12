"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  FileDown,
  Fingerprint,
  KeyRound,
  Plus,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import {
  WidgetCard,
  Button,
  ScrollableWithFade,
  Spinner,
  Tooltip,
  iconButtonHoverClassName,
} from "@dynamic-demos/ui";
import { useTrack } from "@dynamic-demos/analytics";
import { cn, truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { MfaCodeInput } from "@/components/ui/mfa-code-input";
import { SetupMfaScreen } from "@/components/screens/setup-mfa-screen";
import { useDemoMfa } from "@/contexts/demo-mfa-context";
import {
  useExportStepUp,
  useInvalidateMfaCaches,
  useMfaStatus,
  usePreferredFactor,
} from "@/hooks/use-mfa-status";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { useSocialAuth } from "@/hooks/use-mutations";
import { trackedBackup } from "@/lib/analytics/flows";
import {
  mintMfaToken,
  deleteMfaFactor,
  backupWaasKeySharesToGoogleDrive,
  exportWaasClientKeyshares,
  exportWaasPrivateKey,
  getGoogleDriveBackupReadiness,
  getMfaDevices,
  getPasskeys,
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
  /** Scope to one wallet (opened from that wallet's gear). */
  walletAddress?: string;
  chain?: string;
  returnToTxHistory?: { networkId: number };
}

const settingsRowIconClass = "h-[18px] w-[18px] text-(--brand-accent)";

/** Coarse browser name from a UA string, to tell two passkeys apart. */
function browserName(userAgent?: string): string {
  if (!userAgent) return "";
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent)) return "Safari";
  return "";
}

/**
 * One settings row: boxed icon, title, description, trailing control.
 * Same anatomy as the 2FA factor picker, so the two screens match.
 */
function SettingsRow({
  icon,
  title,
  description,
  action,
  onClick,
  disabled,
  dashed,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Marks a demo-only control, not a real product setting. */
  dashed?: boolean;
}) {
  const body = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-(--brand-border) bg-(--brand-surface)">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-(--brand-fg)">{title}</p>
        {/* One line, always - these rows are a scannable stack, not prose. */}
        <p className="truncate text-xs text-(--brand-muted)">{description}</p>
      </div>
      {action}
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3 rounded-(--brand-radius) border border-(--brand-border) p-3 text-left",
    dashed && "border-dashed",
  );

  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        className,
        "group cursor-pointer transition-colors hover:bg-(--brand-row-hover) disabled:opacity-50",
      )}
    >
      {body}
    </button>
  );
}

interface SecurityFactor {
  key: string;
  kind: "passkey" | "mfa";
  label: string;
  meta: string;
  pending: boolean;
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
export function SettingsScreen({
  navigation,
  walletAddress: scopedAddress,
  chain: scopedChain,
  returnToTxHistory,
}: SettingsScreenProps) {
  const { walletAccounts, isLoading } = useWalletAccounts();
  const socialAuth = useSocialAuth();
  const { requireSignMfa, setRequireSignMfa } = useDemoMfa();
  const { canEnrollMfa, isRequired: mfaEnrollmentRequired } = useMfaStatus();
  const invalidateMfaCaches = useInvalidateMfaCaches();
  const {
    needsEnrollment: needsMfaSetup,
    requiresStepUp: revealNeedsStepUp,
    stepUpMethod,
    canUseTotpInstead,
    switchToTotp,
    refetch: refetchMfaStatus,
  } = useExportStepUp();
  const { milestone } = useTrack();
  // Q-017: while settings is up, the code panel shows the backup steps.
  usePanelSectionEffect("settings");

  const [backups, setBackups] = useState<Record<string, BackupState>>({});
  const [exportErrors, setExportErrors] = useState<Record<string, unknown>>(
    {},
  );
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  // Export step-up: the address waiting on a code, the code, and the
  // enrollment detour when nothing is registered yet.
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showFactors, setShowFactors] = useState(false);
  // Factor removal: which row is confirming, and its step-up.
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);
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
  const allWallets =
    uniqueWallets.length > 0 ? uniqueWallets : lastWalletsRef.current;
  // Opened from a wallet's gear: that wallet only. The dashboard gear
  // still opens the unscoped screen, which carries the demo controls.
  const isScoped = Boolean(scopedAddress);
  const wallets = scopedAddress
    ? allWallets.filter(
        (w) => w.address.toLowerCase() === scopedAddress.toLowerCase(),
      )
    : allWallets;
  const [needsGoogleLink, setNeedsGoogleLink] = useState(false);

  // Registered factors, only fetched for the unscoped screen that shows them.
  const { data: securityFactors = [], isLoading: factorsLoading } = useQuery({
    queryKey: ["security-factors"],
    enabled: !isScoped,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [devices, passkeys] = await Promise.all([
        getMfaDevices(),
        getPasskeys(),
      ]);
      const added = (date?: Date) =>
        date ? `Added ${new Date(date).toLocaleDateString()}` : "";
      return [
        ...devices.map((device, index) => ({
          key: device.id ?? `device-${index}`,
          kind: "mfa" as const,
          label:
            device.type === "totp"
              ? "Authenticator app"
              : (device.type ?? "MFA device"),
          meta: added(device.createdAt),
          pending: device.verified === false,
        })),
        // Deliberately not `alias`: Dynamic fills it with the credential id,
        // so it renders as a wall of base64.
        ...passkeys.map((passkey) => ({
          key: passkey.id,
          kind: "passkey" as const,
          label: "Passkey",
          // Two passkeys registered the same day are otherwise identical,
          // which is no basis for choosing which one to delete.
          meta: [browserName(passkey.userAgent), added(passkey.createdAt)]
            .filter(Boolean)
            .join(" · "),
          pending: false,
        })),
      ];
    },
  });

  // Which factor proves the delete, and whether this is the last one standing
  // while the environment still requires 2FA.
  const {
    method: deleteMethod,
    canUseTotpInstead: canDeleteWithCode,
    switchToTotp: switchDeleteToTotp,
  } = usePreferredFactor();
  const isLastFactor = securityFactors.length <= 1 && mfaEnrollmentRequired;

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
      // GTM Phase 09: backup_completed fires only after the reshare/upload
      // resolves - a throw below skips it.
      await trackedBackup(milestone, () =>
        backupWaasKeySharesToGoogleDrive({ walletAccount }),
      );
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

  /**
   * Remove a factor. The SDK needs a `credential:unlink` elevated token, so
   * this is itself step-up protected - prove one factor to drop another.
   */
  const confirmDelete = async (factor: SecurityFactor) => {
    if (deleteBusy) return;
    if (deleteMethod === "totp" && deleteCode.length !== 6) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteMfaFactor({
        factor: { kind: factor.kind, id: factor.key },
        stepUp: { method: deleteMethod, code: deleteCode || undefined },
      });
      setDeletingKey(null);
      setDeleteCode("");
      await invalidateMfaCaches();
    } catch (error) {
      setDeleteCode("");
      setDeleteError(
        error instanceof Error ? error : new Error("Could not remove it."),
      );
    } finally {
      setDeleteBusy(false);
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

  /**
   * Key reveal, gated on the WalletWaasExport step-up. Nothing enrolled
   * means enrollment is the only offer; otherwise a fresh code mints the
   * single-use token the SDK's export consumes.
   */
  const startRevealKey = (
    address: string,
    walletAccount: (typeof uniqueWallets)[number]["walletAccount"],
  ) => {
    if (needsMfaSetup) {
      setShowMfaSetup(true);
      return;
    }
    // TOTP needs a code collected first; a passkey prompts immediately, so
    // there is nothing to show between the click and the OS dialog.
    if (revealNeedsStepUp && stepUpMethod === "totp") {
      setExportError(address, undefined);
      setMfaCode("");
      setCodeFor(address);
      return;
    }
    if (revealNeedsStepUp && stepUpMethod === "passkey") {
      void submitStepUp(address, walletAccount);
      return;
    }
    void handleRevealKey(address, walletAccount);
  };

  const submitStepUp = async (
    address: string,
    walletAccount: (typeof uniqueWallets)[number]["walletAccount"],
  ) => {
    if (!stepUpMethod || verifying) return;
    if (stepUpMethod === "totp" && mfaCode.length !== 6) return;
    setVerifying(true);
    try {
      await mintMfaToken({ method: stepUpMethod, code: mfaCode || undefined });
      setCodeFor(null);
      setMfaCode("");
      await handleRevealKey(address, walletAccount);
    } catch (error) {
      // Spent code or cancelled passkey prompt - clear so it can be retried.
      setMfaCode("");
      setExportError(address, error);
      // A passkey that isn't on this device can't succeed however many
      // times it's retried, so drop to the code instead of looping.
      if (stepUpMethod === "passkey" && canUseTotpInstead) {
        switchToTotp();
        setCodeFor(address);
      } else {
        setCodeFor(null);
      }
    } finally {
      setVerifying(false);
    }
  };

  const hideRevealedKey = () => {
    setCodeFor(null);
    if (revealedFor) {
      revealContainers.current.get(revealedFor)?.replaceChildren();
    }
    setRevealedFor(null);
  };

  // Export is a protected action but no authenticator exists - enrollment
  // is the only way through, same detour the signing flows take.
  if (showMfaSetup) {
    return (
      <SetupMfaScreen
        onSuccess={() => {
          refetchMfaStatus();
          setShowMfaSetup(false);
        }}
        onCancel={() => setShowMfaSetup(false)}
      />
    );
  }

  // Registered factors, one level down - a list needs room the row hasn't got.
  if (showFactors) {
    return (
      <WidgetCard
        title="Two-factor authentication"
        subtitle="Registered factors"
        onBack={() => setShowFactors(false)}
      >
        <div className="space-y-2">
          {factorsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="lg" />
            </div>
          ) : securityFactors.length === 0 ? (
            <p className="py-4 text-center text-sm text-(--brand-muted)">
              Nothing registered yet.
            </p>
          ) : (
            securityFactors.map((factor) => {
              const confirming = deletingKey === factor.key;
              return (
                // The confirm lives inside the factor's own box, divided by a
                // rule - two stacked cards read as two unrelated things.
                <div
                  key={factor.key}
                  className="overflow-hidden rounded-(--brand-radius) border border-(--brand-border)"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-(--brand-border) bg-(--brand-surface)">
                      {factor.kind === "passkey" ? (
                        <Fingerprint
                          className={settingsRowIconClass}
                          strokeWidth={1.5}
                        />
                      ) : (
                        <Shield
                          className={settingsRowIconClass}
                          strokeWidth={1.5}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-(--brand-fg)">
                        {factor.label}
                      </p>
                      <p className="truncate text-xs text-(--brand-muted)">
                        {factor.pending ? "Unverified" : factor.meta}
                      </p>
                    </div>
                    <Tooltip
                      content={
                        isLastFactor
                          ? "2FA is required - add another factor first"
                          : confirming
                            ? "Cancel"
                            : "Remove"
                      }
                    >
                      {/* Removing the last factor while 2FA is required
                          strands the user: the wallet locks and the delete
                          itself needs a step-up they can no longer do. */}
                      <span>
                        <button
                          type="button"
                          disabled={isLastFactor || deleteBusy}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteCode("");
                            setDeletingKey(confirming ? null : factor.key);
                          }}
                          aria-label={
                            confirming
                              ? "Cancel removal"
                              : `Remove ${factor.label}`
                          }
                          className={cn(
                            "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                            "text-(--brand-muted) hover:text-(--brand-fg)",
                            iconButtonHoverClassName,
                          )}
                        >
                          {/* The button toggles, so the icon has to say
                              which way it goes. */}
                          {confirming ? (
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          ) : (
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                          )}
                        </button>
                      </span>
                    </Tooltip>
                  </div>

                  {confirming ? (
                    <div className="px-3 pb-3">
                      {/* Rule is inset to the content, not bled to the box
                          edge - it separates the two sections, and they
                          share one left margin. */}
                      <div className="mb-3 border-t border-(--brand-border)" />
                      <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs leading-relaxed text-(--brand-muted)">
                          {deleteMethod === "totp"
                            ? "Enter a code from your authenticator to remove this factor."
                            : "Confirm with your passkey to remove this factor."}
                        </p>
                        {canDeleteWithCode && (
                          <button
                            type="button"
                            onClick={switchDeleteToTotp}
                            className="ml-auto shrink-0 cursor-pointer text-xs font-medium text-(--brand-accent) hover:underline"
                          >
                            Use a code
                          </button>
                        )}
                      </div>
                      {deleteMethod === "totp" ? (
                        <MfaCodeInput
                          value={deleteCode}
                          onChange={setDeleteCode}
                          disabled={deleteBusy}
                          autoFocus
                        />
                      ) : null}
                      <ErrorMessage error={deleteError} />
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          disabled={deleteBusy}
                          onClick={() => setDeletingKey(null)}
                        >
                          Cancel
                        </Button>
                        {/* Destructive at rest, not solid: red text and
                            border on the outline shape, filling only on
                            hover. */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-(--brand-error)/40 text-(--brand-error) hover:border-(--brand-error) hover:bg-(--brand-error)/10 hover:text-(--brand-error)"
                          loading={deleteBusy}
                          disabled={
                            deleteMethod === "totp" && deleteCode.length !== 6
                          }
                          onClick={() => confirmDelete(factor)}
                        >
                          Remove
                        </Button>
                      </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          {canEnrollMfa && !factorsLoading ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowMfaSetup(true)}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Add a factor
            </Button>
          ) : null}
        </div>
      </WidgetCard>
    );
  }

  const back = () =>
    returnToTxHistory && scopedAddress && scopedChain
      ? navigation.goToTxHistory(
          scopedAddress,
          scopedChain,
          returnToTxHistory.networkId,
        )
      : navigation.goToDashboard();

  return (
    <WidgetCard
      onBack={back}
      title={isScoped ? "Backup & recovery" : "User Settings"}
      subtitle={
        isScoped && scopedAddress
          ? truncateAddress(scopedAddress)
          : "Security & session"
      }
    >
      <div className="space-y-4">
        {/* No section heading: the card subtitle already names the
            screen's single section. */}
        {isScoped ? (
          <div>
            <p className="text-xs leading-relaxed text-(--brand-muted)">
              {needsMfaSetup
                ? "This environment requires 2FA before the embedded wallet can be used. Set up an authenticator to unlock backup and export."
                : "Two ways to recover this wallet: back up an encrypted key share to Google Drive, or download the share as a file you keep. On Google's consent screen, tick both Drive permissions."}
            </p>
          </div>
        ) : null}

        {!isScoped ? null : isLoading ? (
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
                        never changes) - except with enrollment
                        outstanding, when the Shield is the only action
                        that isn't a dead end. */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {needsMfaSetup ? null : isBackedUp && isDownloaded ? (
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
                          needsMfaSetup
                            ? "Set up 2FA to reveal the key"
                            : isRevealed
                              ? "Hide private key"
                              : "Reveal private key"
                        }
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2"
                          onClick={() =>
                            isRevealed
                              ? hideRevealedKey()
                              : startRevealKey(address, walletAccount)
                          }
                          aria-label={
                            needsMfaSetup
                              ? "Set up 2FA to reveal the key"
                              : isRevealed
                                ? "Hide private key"
                                : "Reveal private key"
                          }
                        >
                          {needsMfaSetup ? (
                            <Shield
                              className="h-4 w-4 text-(--brand-accent)"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                          ) : (
                            <KeyRound
                              className="h-4 w-4"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                          )}
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                  {/* Step-up: the environment protects Wallet Export, so a
                      fresh code mints the token the reveal consumes. */}
                  {codeFor === address ? (
                    <div className="mt-2.5 space-y-2">
                      <MfaCodeInput
                        value={mfaCode}
                        onChange={setMfaCode}
                        disabled={verifying}
                        autoFocus
                        contained
                        helperMessage="Revealing a private key needs 2FA."
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          disabled={verifying}
                          onClick={() => {
                            setCodeFor(null);
                            setMfaCode("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          loading={verifying}
                          disabled={mfaCode.length !== 6}
                          onClick={() =>
                            submitStepUp(address, walletAccount)
                          }
                        >
                          Reveal key
                        </Button>
                      </div>
                    </div>
                  ) : null}
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

        {/* One row anatomy for every setting - icon box, title, description,
            trailing control - so the stack reads like the 2FA picker. */}
        {isScoped ? null : (
          <>
            <SettingsRow
              icon={<Shield className={settingsRowIconClass} strokeWidth={1.5} />}
              title="Two-factor authentication"
              description={
                factorsLoading
                  ? "Checking…"
                  : securityFactors.length
                    ? `${securityFactors.length} registered`
                    : canEnrollMfa
                      ? "Not set up yet."
                      : "Enable MFA in your environment."
              }
              onClick={
                canEnrollMfa || securityFactors.length
                  ? () => setShowFactors(true)
                  : undefined
              }
              action={
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-(--brand-muted) transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                  strokeWidth={1.5}
                  aria-hidden
                />
              }
            />

            {/* Demo control: treat signing as protected locally. Needs 2FA
                enabled in the environment - nothing to enroll otherwise. */}
            <SettingsRow
              icon={<KeyRound className={settingsRowIconClass} strokeWidth={1.5} />}
              title="Require 2FA"
              dashed
              description={
                canEnrollMfa
                  ? "Every action requires a 2nd factor."
                  : "Enable MFA in your environment."
              }
              action={
                <button
                  type="button"
                  role="switch"
                  aria-checked={requireSignMfa && canEnrollMfa}
                  aria-label="Require 2FA"
                  disabled={!canEnrollMfa}
                  onClick={() => setRequireSignMfa(!requireSignMfa)}
                  className={cn(
                    "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                    requireSignMfa && canEnrollMfa
                      ? "bg-(--brand-accent)"
                      : "bg-(--brand-border)",
                    !canEnrollMfa && "cursor-not-allowed opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                      requireSignMfa && canEnrollMfa && "translate-x-4",
                    )}
                  />
                </button>
              }
            />

          </>
        )}
      </div>
    </WidgetCard>
  );
}

