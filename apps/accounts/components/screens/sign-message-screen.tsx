"use client";

/**
 * Sign an arbitrary message with a business-account wallet.
 *
 * The cheapest proof that a co-signed wallet really signs: no network, no gas,
 * no recipient, nothing to fund. A transfer that fails can always be blamed on
 * an empty balance; a signature that comes back cannot.
 *
 * Free-text on purpose - a fixed demo string would prove the button works, not
 * that the key does.
 */

import { useState } from "react";
import { PenLine } from "lucide-react";
import {
  Button,
  CopyButton,
  Spinner,
  WidgetCard,
} from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import {
  useAccountWalletAccounts,
} from "@/hooks/use-wallet-accounts";
import { useSignMessage } from "@/hooks/use-wallet-actions";
import { findSignableWallet } from "@/lib/dynamic";
import type { BusinessAccountWalletSummary } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function SignMessageScreen({
  businessAccountId,
  wallet,
  navigation,
}: {
  businessAccountId: string;
  wallet: BusinessAccountWalletSummary;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("signing");

  const [message, setMessage] = useState("");

  const { walletAccounts } = useAccountWalletAccounts(businessAccountId);
  const signable = findSignableWallet(walletAccounts, wallet);
  const sign = useSignMessage();

  const address = signable?.address ?? wallet.publicKey ?? "";
  const signature = sign.data?.signature;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!signable || !message.trim() || sign.isPending) return;

    void sign
      .mutateAsync({ walletAccount: signable, message })
      .catch(() => {
        // Rendered below from the mutation's error.
      });
  };

  const back = () => navigation.goToWalletTransactions(businessAccountId, wallet);

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

        {/* One spinner, wearing its own label. `Button`'s `loading` swaps the
            children out for a bare spinner, so a second line underneath was
            the only way to say anything - and then there were two. */}
        <Button
          type="submit"
          className="w-full"
          disabled={!signable || !message.trim() || sign.isPending}
        >
          {sign.isPending ? (
            <>
              <Spinner size="sm" className="border-white/30 border-t-white" />
              Signing with your share…
            </>
          ) : (
            <>
              <PenLine className="h-4 w-4" />
              Sign Message
            </>
          )}
        </Button>

        <ErrorMessage error={sign.error} />
      </form>
    </WidgetCard>
  );
}
