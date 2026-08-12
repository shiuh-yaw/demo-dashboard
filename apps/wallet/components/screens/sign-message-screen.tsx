"use client";

/**
 * Sign an arbitrary message with an embedded wallet.
 *
 * The cheapest proof that the wallet really signs: no network, no gas, no
 * recipient, nothing to fund. A transfer that fails can always be blamed on an
 * empty balance; a signature that comes back cannot.
 *
 * Free-text on purpose - a fixed demo string would prove the button works, not
 * that the key does.
 */

import { useState } from "react";
import { PenLine, Shield } from "lucide-react";
import { Button, CopyButton, Spinner, WidgetCard } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { MfaCodeInput } from "@/components/ui/mfa-code-input";
import { SetupMfaScreen } from "@/components/screens/setup-mfa-screen";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { useSignMessage } from "@/hooks/use-mutations";
import { useSignStepUp, isMfaRequiredError } from "@/hooks/use-mfa-status";
import { useMilestoneOnce } from "@/hooks/use-milestone-once";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function SignMessageScreen({
  walletAddress,
  chain,
  navigation,
  returnToTxHistory,
}: {
  walletAddress: string;
  chain: string;
  navigation: NavigationReturn;
  returnToTxHistory?: { networkId: number };
}) {
  usePanelSectionEffect("signing");

  const [message, setMessage] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showMfaSetup, setShowMfaSetup] = useState(false);

  const { walletAccounts } = useWalletAccounts();
  const signable =
    walletAccounts.find(
      (w) =>
        w.address.toLowerCase() === walletAddress.toLowerCase() &&
        w.chain === chain,
    ) ?? null;
  const sign = useSignMessage();
  const milestoneOnce = useMilestoneOnce();
  const {
    requiresStepUp,
    stepUpMethod,
    canUseTotpInstead,
    switchToTotp,
    needsEnrollment: needsMfaSetup,
    refetch: refetchMfaStatus,
  } = useSignStepUp();
  // Passkey step-up has no code to type - the SDK prompts the OS instead.
  const requiresMfa = requiresStepUp && stepUpMethod === "totp";

  const address = signable?.address ?? walletAddress;
  const signature = sign.data?.signature;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!signable || !message.trim() || sign.isPending) return;
    if (requiresMfa && mfaCode.length !== 6) return;

    void sign
      .mutateAsync({
        walletAccount: signable,
        message,
        stepUp:
          requiresStepUp && stepUpMethod
            ? { method: stepUpMethod, code: mfaCode || undefined }
            : undefined,
      })
      .then(() => milestoneOnce("message_signed"))
      .catch((error) => {
        // MFA enforced but no device yet - route into setup, same as send.
        if (isMfaRequiredError(error)) {
          setShowMfaSetup(true);
          return;
        }
        // Otherwise the error renders below; drop the spent code so the
        // user can enter a fresh one.
        setMfaCode("");
      });
  };

  // Return to wherever this screen was opened from - the transactions
  // toolbar or the dashboard wallet list.
  const back = () =>
    returnToTxHistory
      ? navigation.goToTxHistory(walletAddress, chain, returnToTxHistory.networkId)
      : navigation.goToDashboard();

  // Action-MFA is enforced but the user has no device - detour through the
  // shared setup screen, then drop back into signing.
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

  if (signature) {
    return (
      <WidgetCard
        title="Message Signed"
        subtitle={truncateAddress(address)}
        onBack={back}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-(--brand-fg)">
              Message
            </span>
            <p className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2 text-xs text-(--brand-fg)">
              {message}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between gap-2 text-xs font-medium text-(--brand-fg)">
              Signature
              <CopyButton
                text={signature}
                size="sm"
                label="Copy signature"
                showTooltip
              />
            </span>
            {/* Full, wrapped, scrollable - truncating a signature makes it
                useless to the one reader who wants it, which is someone about
                to paste it into a verifier. */}
            <p className="max-h-32 overflow-y-auto break-all rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2 font-mono text-[11px] leading-relaxed text-(--brand-fg)">
              {signature}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                sign.reset();
                setMessage("");
                setMfaCode("");
              }}
            >
              Sign another
            </Button>
            <Button className="w-full" onClick={back}>
              Done
            </Button>
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Sign Message"
      subtitle={
        <span className="flex items-center gap-1.5">
          With {truncateAddress(address)}
          <CopyButton text={address} size="sm" label="Copy address" />
        </span>
      }
      onBack={back}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="sign-message"
            className="text-sm font-medium text-(--brand-fg)"
          >
            Message
          </label>
          <textarea
            id="sign-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Anything you want signed"
            rows={3}
            autoFocus
            disabled={sign.isPending}
            className="w-full resize-none rounded-lg border border-(--brand-border) bg-(--brand-surface,#fff) px-3 py-2 text-sm text-(--brand-fg) outline-none placeholder:text-(--brand-muted) focus:border-(--brand-primary) disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {needsMfaSetup ? (
          // MFA required (env or demo toggle) but no authenticator yet -
          // set one up before a code can be entered.
          <Button
            type="button"
            className="w-full"
            onClick={() => setShowMfaSetup(true)}
          >
            <Shield className="h-4 w-4" />
            Set up 2FA to sign
          </Button>
        ) : (
          <>
            {/* Step-up: MFA gates the WalletWaasSign action, so a fresh TOTP
                code is required before the signature. */}
            {requiresMfa && (
              <MfaCodeInput
                value={mfaCode}
                onChange={setMfaCode}
                disabled={sign.isPending}
                contained
              />
            )}

            {/* Passkey has no code - say so, since the OS prompt only
                appears after the button is pressed. */}
            {requiresStepUp && stepUpMethod === "passkey" && (
              <div className="flex items-center gap-2 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) p-3">
                <Shield className="h-4 w-4 shrink-0 text-(--brand-accent)" />
                <span className="text-xs text-(--brand-muted)">
                  You&apos;ll confirm with your passkey when you sign.
                </span>
                {/* A passkey lives on the device that made it - offer the
                    code to anyone who arrived on a different one. */}
                {canUseTotpInstead && (
                  <button
                    type="button"
                    onClick={switchToTotp}
                    className="ml-auto shrink-0 cursor-pointer text-xs font-medium text-(--brand-accent) hover:underline"
                  >
                    Use a code
                  </button>
                )}
              </div>
            )}

            {/* One spinner, wearing its own label. `Button`'s `loading` swaps
                the children out for a bare spinner, so a second line
                underneath was the only way to say anything - and then there
                were two. */}
            <Button
              type="submit"
              className="w-full"
              disabled={
                !signable ||
                !message.trim() ||
                sign.isPending ||
                (requiresMfa && mfaCode.length !== 6)
              }
            >
              {sign.isPending ? (
                <>
                  <Spinner
                    size="sm"
                    className="border-white/30 border-t-white"
                  />
                  Signing with your wallet…
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4" />
                  Sign Message
                </>
              )}
            </Button>
          </>
        )}

        <ErrorMessage error={sign.error} />
      </form>
    </WidgetCard>
  );
}
