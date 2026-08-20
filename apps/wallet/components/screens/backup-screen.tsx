"use client";

/**
 * Backup & recovery for ONE wallet: an encrypted key share in the user's
 * Google Drive, or the same share downloaded as a file they keep.
 *
 * Download is gated on the backup because the backup reshares the key, which
 * would leave a file taken beforehand stale.
 */

import { useState } from "react";
import { CheckCircle2, CloudUpload, FileDown, Shield } from "lucide-react";
import { Button, Tooltip, WidgetCard } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import {
  SettingsIntro,
  SettingsRowCard,
  settingsRowIconClass,
} from "@/components/ui/settings-row";
import { SetupMfaScreen } from "@/components/screens/setup-mfa-screen";
import {
  useExportStepUp,
  useInvalidateMfaCaches,
} from "@/hooks/use-mfa-status";
import { useSocialAuth } from "@/hooks/use-mutations";
import { useWalletBackup } from "@/hooks/use-wallet-backup";
import type { WalletAccount } from "@/lib/dynamic";

export function BackupScreen({
  walletAccount,
  onBack,
}: {
  walletAccount: WalletAccount;
  onBack: () => void;
}) {
  const backup = useWalletBackup(walletAccount);
  const socialAuth = useSocialAuth();
  const { needsEnrollment: needsMfaSetup } = useExportStepUp();
  const invalidateMfaCaches = useInvalidateMfaCaches();
  const [enrolling, setEnrolling] = useState(false);

  if (enrolling) {
    return (
      <SetupMfaScreen
        onSuccess={() => {
          void invalidateMfaCaches();
          setEnrolling(false);
        }}
        onCancel={() => setEnrolling(false)}
      />
    );
  }

  // Enrollment outstanding means every WaaS call throws before it starts, so
  // both backup rows would dead-end. Offer the one thing that can succeed.
  if (needsMfaSetup) {
    return (
      <WidgetCard
        title="Backup & recovery"
        subtitle={truncateAddress(walletAccount.address)}
        onBack={onBack}
      >
        <div className="space-y-3">
          <SettingsIntro>
            This environment requires 2FA before the embedded wallet can be
            used, backup included.
          </SettingsIntro>
          <SettingsRowCard
            icon={<Shield className={settingsRowIconClass} strokeWidth={1.5} />}
            title="Set up 2FA"
            description="Unlocks backup and recovery."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEnrolling(true)}
              >
                Set up
              </Button>
            }
          />
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Backup & recovery"
      subtitle={truncateAddress(walletAccount.address)}
      onBack={onBack}
    >
      <div className="space-y-3">
        <SettingsIntro>
          Two ways to recover this wallet. On Google&apos;s consent screen, tick
          both Drive permissions - they are unchecked by default.
        </SettingsIntro>

        <SettingsRowCard
          icon={
            backup.isBackedUp ? (
              <CheckCircle2
                className={settingsRowIconClass}
                strokeWidth={1.5}
              />
            ) : (
              <CloudUpload className={settingsRowIconClass} strokeWidth={1.5} />
            )
          }
          title="Google Drive"
          description={
            backup.isBackedUp
              ? "An encrypted share is in your Drive."
              : "Keep an encrypted share in your Drive."
          }
          action={
            backup.isBackedUp ? (
              <span className="shrink-0 text-xs font-medium text-(--brand-accent)">
                Backed up
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                loading={backup.isBackingUp}
                onClick={() => void backup.backUp()}
              >
                Back up
              </Button>
            )
          }
        />

        <SettingsRowCard
          icon={<FileDown className={settingsRowIconClass} strokeWidth={1.5} />}
          title="Share file"
          description={
            backup.isDownloaded
              ? "Downloaded. Keep it somewhere safe."
              : "Save the share as a file you hold."
          }
          action={
            <Tooltip
              content={
                backup.isBackedUp
                  ? "Save the key share as a file"
                  : "Back up first - the share changes during backup"
              }
            >
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!backup.isBackedUp}
                  loading={backup.isDownloading}
                  onClick={() => void backup.downloadShare()}
                >
                  {backup.isDownloaded ? "Download again" : "Download"}
                </Button>
              </span>
            </Tooltip>
          }
        />

        {backup.needsGoogleLink ? (
          <div className="rounded-(--brand-radius) border border-(--brand-border) p-3">
            <SettingsIntro>
              Backups need a Google account with Drive access. Connect Google
              and tick both Drive permissions on the consent screen, then back
              up again.
            </SettingsIntro>
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

        <ErrorMessage
          error={backup.error}
          defaultMessage="Backup failed. Please try again."
        />
      </div>
    </WidgetCard>
  );
}
