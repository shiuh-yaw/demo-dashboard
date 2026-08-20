"use client";

/**
 * Private-key reveal for ONE wallet. Dynamic injects a secure iframe into the
 * container below, so the key never passes through app code.
 *
 * The container stays mounted (hidden) so it exists synchronously on click.
 */

import { useState } from "react";
import { KeyRound, Shield } from "lucide-react";
import { Button, WidgetCard } from "@dynamic-demos/ui";
import { cn, truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { MfaCodeInput } from "@/components/ui/mfa-code-input";
import { SetupMfaScreen } from "@/components/screens/setup-mfa-screen";
import {
  SettingsIntro,
  SettingsRowCard,
  settingsRowIconClass,
} from "@/components/ui/settings-row";
import { useInvalidateMfaCaches } from "@/hooks/use-mfa-status";
import { useRevealPrivateKey } from "@/hooks/use-reveal-private-key";
import type { WalletAccount } from "@/lib/dynamic";

/**
 * The SDK's iframe is `height: 100%` of the box we hand it and cannot report
 * its content height (cross-origin), so the box has to be sized for the key it
 * will show. EVM is 64 hex characters and wraps to two lines; every other chain
 * encodes longer (Solana base58 runs to ~88) and needs a third. `overflow-auto`
 * is the backstop: a mis-sized box scrolls rather than cutting a key in half.
 */
function keyBoxHeight(chain: string): string {
  return chain === "EVM" ? "h-20" : "h-28";
}

export function PrivateKeyScreen({
  walletAccount,
  onBack,
}: {
  walletAccount: WalletAccount;
  onBack: () => void;
}) {
  const [enrolling, setEnrolling] = useState(false);
  const invalidateMfaCaches = useInvalidateMfaCaches();
  const privateKey = useRevealPrivateKey(walletAccount, {
    onNeedsMfaSetup: () => setEnrolling(true),
  });

  // Reveal is protected but nothing is enrolled, so enrollment is the detour.
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

  return (
    <WidgetCard
      title="Private key"
      subtitle={truncateAddress(walletAccount.address)}
      onBack={onBack}
    >
      <div className="space-y-3">
        <SettingsIntro>
          {privateKey.needsMfaSetup
            ? "This environment requires 2FA before a key can be revealed. Set up an authenticator to unlock it."
            : "Anyone with this key controls the wallet. Never share it or paste it anywhere you do not fully trust."}
        </SettingsIntro>

        <SettingsRowCard
          icon={
            privateKey.needsMfaSetup ? (
              <Shield className={settingsRowIconClass} strokeWidth={1.5} />
            ) : (
              <KeyRound className={settingsRowIconClass} strokeWidth={1.5} />
            )
          }
          title="Reveal private key"
          description={
            privateKey.needsMfaSetup
              ? "Set up 2FA first."
              : "Shown in a secure frame from Dynamic."
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={privateKey.isRevealed ? privateKey.hide : privateKey.reveal}
            >
              {privateKey.needsMfaSetup
                ? "Set up 2FA"
                : privateKey.isRevealed
                  ? "Hide"
                  : "Reveal"}
            </Button>
          }
        >
          {privateKey.awaitingCode ? (
            <div className="space-y-2">
              <MfaCodeInput
                value={privateKey.code}
                onChange={privateKey.setCode}
                disabled={privateKey.isVerifying}
                autoFocus
                contained
                helperMessage="Revealing a private key needs 2FA."
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  disabled={privateKey.isVerifying}
                  onClick={privateKey.cancelCode}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  loading={privateKey.isVerifying}
                  disabled={privateKey.code.length !== 6}
                  onClick={() => void privateKey.submitCode()}
                >
                  Reveal key
                </Button>
              </div>
            </div>
          ) : null}
        </SettingsRowCard>

        {/* Filled, not bordered: the key is output, and a second bordered box
            under the row reads as another setting. Stays in the DOM while
            hidden, and the iframe width needs the important modifier because
            the SDK sets its own. */}
        <div
          ref={privateKey.containerRef}
          className={cn(
            keyBoxHeight(walletAccount.chain),
            "overflow-auto rounded-(--brand-radius) bg-(--brand-row-bg) p-3 [&_iframe]:block [&_iframe]:w-full!",
            !privateKey.isRevealed && "hidden",
          )}
        />

        <ErrorMessage
          error={privateKey.error}
          defaultMessage="Could not reveal the key. Please try again."
        />
      </div>
    </WidgetCard>
  );
}
