"use client";

/**
 * Settings, as one stack of rows that each open a screen of their own.
 *
 * Two shapes from the same component: the dashboard gear opens the user-wide
 * screen (2FA, demo controls); a wallet's gear opens the wallet-scoped one
 * (backup, private key, delegated access), because all three are granted per
 * wallet account.
 */

import { useState } from "react";
import { CloudUpload, Handshake, KeyRound, Shield } from "lucide-react";
import { WidgetCard, Spinner } from "@dynamic-demos/ui";
import { cn, truncateAddress } from "@dynamic-demos/utils";
import { BackupScreen } from "@/components/screens/backup-screen";
import { DelegationScreen } from "@/components/screens/delegation-screen";
import { PrivateKeyScreen } from "@/components/screens/private-key-screen";
import { SecurityFactorsScreen } from "@/components/screens/security-factors-screen";
import {
  SettingsDrillInRow,
  SettingsRow,
  settingsRowIconClass,
} from "@/components/ui/settings-row";
import { isDelegationConfigured } from "@/lib/delegation-api";
import { isDelegatableWallet } from "@/hooks/use-delegation";
import { useDemoMfa } from "@/contexts/demo-mfa-context";
import { useExportStepUp, useMfaStatus } from "@/hooks/use-mfa-status";
import { useSecurityFactors } from "@/hooks/use-security-factors";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { isWalletBackedUpToGoogleDrive } from "@/lib/dynamic";
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

type DrillIn = "backup" | "private-key" | "delegation" | "factors";

export function SettingsScreen({
  navigation,
  walletAddress: scopedAddress,
  chain: scopedChain,
  returnToTxHistory,
}: SettingsScreenProps) {
  const { walletAccounts, isLoading } = useWalletAccounts();
  const { requireSignMfa, setRequireSignMfa } = useDemoMfa();
  const { canEnrollMfa } = useMfaStatus();
  const { needsEnrollment: needsMfaSetup } = useExportStepUp();
  const [drillIn, setDrillIn] = useState<DrillIn | null>(null);

  const isScoped = Boolean(scopedAddress);
  // Only the user-wide screen shows a factor count.
  const { factors, isLoading: factorsLoading } = useSecurityFactors({
    enabled: !isScoped,
  });

  // This screen owns the panel section for its whole subtree: a drill-in that
  // claimed one would reset the panel on unmount, under a still-mounted parent.
  usePanelSectionEffect(drillIn === "delegation" ? "delegation" : "settings");

  // `useWalletAccounts` already holds the last non-empty list, so an empty one
  // here means logged out, not mid-refetch.
  const wallet = scopedAddress
    ? getUniqueWalletAddresses(walletAccounts).find(
        (w) => w.address.toLowerCase() === scopedAddress.toLowerCase(),
      )
    : undefined;

  // Only chains a delegated signer package ships for (EVM, Solana).
  const delegatable =
    wallet &&
    isDelegationConfigured() &&
    isDelegatableWallet(wallet.walletAccount)
      ? wallet.walletAccount
      : null;

  if (wallet && drillIn === "backup") {
    return (
      <BackupScreen
        walletAccount={wallet.walletAccount}
        onBack={() => setDrillIn(null)}
      />
    );
  }

  if (wallet && drillIn === "private-key") {
    return (
      <PrivateKeyScreen
        walletAccount={wallet.walletAccount}
        onBack={() => setDrillIn(null)}
      />
    );
  }

  if (delegatable && drillIn === "delegation") {
    return (
      <DelegationScreen
        walletAccount={delegatable}
        onBack={() => setDrillIn(null)}
      />
    );
  }

  if (drillIn === "factors") {
    return <SecurityFactorsScreen onBack={() => setDrillIn(null)} />;
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
      title={isScoped ? "Wallet settings" : "User Settings"}
      subtitle={
        isScoped && scopedAddress
          ? truncateAddress(scopedAddress)
          : "Security & session"
      }
    >
      <div className="space-y-2">
        {isScoped ? (
          isLoading && !wallet ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : !wallet ? (
            <p className="py-4 text-center text-sm text-(--brand-muted)">
              No wallets yet - create one first.
            </p>
          ) : (
            <>
              <SettingsDrillInRow
                icon={
                  <CloudUpload
                    className={settingsRowIconClass}
                    strokeWidth={1.5}
                  />
                }
                title="Backup & recovery"
                description={
                  isWalletBackedUpToGoogleDrive(wallet.walletAccount)
                    ? "Backed up to Google Drive."
                    : "Not backed up yet."
                }
                onClick={() => setDrillIn("backup")}
              />

              {delegatable ? (
                <SettingsDrillInRow
                  icon={
                    <Handshake
                      className={settingsRowIconClass}
                      strokeWidth={1.5}
                    />
                  }
                  title="Delegated access"
                  description="Let this app sign while you are away."
                  onClick={() => setDrillIn("delegation")}
                />
              ) : null}

              <SettingsDrillInRow
                icon={
                  needsMfaSetup ? (
                    <Shield
                      className={settingsRowIconClass}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <KeyRound
                      className={settingsRowIconClass}
                      strokeWidth={1.5}
                    />
                  )
                }
                title="Private key"
                description={
                  needsMfaSetup
                    ? "Set up 2FA to reveal it."
                    : "Reveal it in a secure frame."
                }
                onClick={() => setDrillIn("private-key")}
              />
            </>
          )
        ) : (
          <>
            <SettingsDrillInRow
              icon={
                <Shield className={settingsRowIconClass} strokeWidth={1.5} />
              }
              title="Two-factor authentication"
              description={
                factorsLoading
                  ? "Checking…"
                  : factors.length
                    ? `${factors.length} registered`
                    : canEnrollMfa
                      ? "Not set up yet."
                      : "Enable MFA in your environment."
              }
              disabled={!canEnrollMfa && factors.length === 0}
              onClick={() => setDrillIn("factors")}
            />

            {/* Demo control: treat signing as protected locally. Needs 2FA
                enabled in the environment - nothing to enroll otherwise. */}
            <SettingsRow
              icon={
                <KeyRound className={settingsRowIconClass} strokeWidth={1.5} />
              }
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
