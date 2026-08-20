"use client";

/**
 * Delegated access for ONE wallet, opened from that wallet's settings - the
 * same per-wallet shape as backup & recovery, because delegation is granted
 * per wallet account, not per user.
 *
 * EVM and Solana only: those are the chains a delegated signer package ships
 * for, so the row is never offered elsewhere rather than shown as a dead
 * control.
 */

import { useState } from "react";
import { useUser } from "@dynamic-labs-sdk/react-hooks";
import { Handshake, Trash2 } from "lucide-react";
import { cn, truncateAddress } from "@dynamic-demos/utils";
import { Button, Spinner, WidgetCard } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { SettingsIntro, SettingsRowCard } from "@/components/ui/settings-row";
import {
  hasDelegatedAccess,
  useDelegateWallet,
  useDelegationIntent,
  useRevokeDelegation,
  useSignAsDelegate,
} from "@/hooks/use-delegation";
import {
  resolveDelegationState,
  type DelegationState,
} from "@/lib/delegation-state";
import type { WalletAccount } from "@/lib/dynamic";
import type { DelegatedSignature } from "@/lib/delegation-api";

/** What the app is asked to sign. Fixed so the demo has one moving part. */
const DEMO_MESSAGE = "Signed by the app, on your behalf.";

export function DelegationScreen({
  walletAccount,
  onBack,
}: {
  walletAccount: WalletAccount;
  onBack: () => void;
}) {
  const delegate = useDelegateWallet();
  const revoke = useRevokeDelegation();
  const sign = useSignAsDelegate();
  const [signature, setSignature] = useState<DelegatedSignature | null>(null);
  // No usePanelSectionEffect here: this renders inside SettingsScreen, which
  // owns the section. Unmounting a nested claim resets the panel under the
  // still-mounted parent.

  // hasDelegatedAccess is a synchronous read off the user's verified
  // credential, so it is NOT reactive on its own. Subscribing to the user here
  // is what makes the row re-render (and the read re-run) once the SDK's own
  // refreshAuth lands at the end of a grant or revoke.
  useUser();

  // hasDelegatedAccess throws when the wallet has no verified credential.
  // Catch it here: a broken read must not blank the screen, but it must not
  // silently read as "not delegated" either - surface it below.
  let delegatedOnDynamic = false;
  let statusError: Error | null = null;
  try {
    delegatedOnDynamic = hasDelegatedAccess(walletAccount);
  } catch (error) {
    statusError = error instanceof Error ? error : new Error("Unknown error");
  }

  const { pending, start, abandon } = useDelegationIntent(delegatedOnDynamic);

  const state = resolveDelegationState({
    delegatedOnDynamic,
    isDelegating: delegate.isPending,
    isRevoking: revoke.isPending,
    pending,
  });

  // Latch before the request, not after: `mutate`'s callbacks run once the
  // mutation has already settled, while the SDK's refreshAuth is still landing.
  const handleDelegate = () => {
    start("grant");
    delegate.mutate(walletAccount, { onError: abandon });
  };

  const handleRevoke = () => {
    setSignature(null);
    start("revoke");
    revoke.mutate(walletAccount, { onError: abandon });
  };

  const handleSign = () =>
    sign.mutate(
      { address: walletAccount.address, message: DEMO_MESSAGE },
      { onSuccess: (result: DelegatedSignature) => setSignature(result) },
    );

  return (
    <WidgetCard
      title="Delegated access"
      subtitle={truncateAddress(walletAccount.address)}
      onBack={onBack}
    >
      <div className="space-y-3">
        {/* Two lines, not four - the rest of settings is a scannable stack. */}
        <SettingsIntro>
          Let this app sign for you even while you are away. Your key stays
          split, so it can never sign alone - and you can remove access whenever
          you want.
        </SettingsIntro>

        <SettingsRowCard
          icon={
            <Handshake
              className={cn(
                "h-[18px] w-[18px]",
                state === "delegated"
                  ? "text-(--brand-accent)"
                  : "text-(--brand-muted)",
              )}
              strokeWidth={1.5}
            />
          }
          title={
            <>
              {/* A status this important should read at a glance. */}
              {state === "delegated" ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--brand-accent)"
                  aria-hidden
                />
              ) : null}
              {stateTitle(state)}
            </>
          }
          description={stateDetail(state, signature?.signedAt)}
          action={
            state === "delegating" || state === "revoking" ? (
              <Spinner size="sm" />
            ) : state === "delegated" ? (
              <button
                type="button"
                onClick={handleRevoke}
                aria-label="Remove access"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-(--brand-radius) text-(--brand-muted) transition-colors hover:bg-(--brand-row-hover) hover:text-(--brand-error)"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleDelegate}>
                Allow
              </Button>
            )
          }
        >
          {state === "delegated" ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                disabled={sign.isPending}
                onClick={handleSign}
              >
                {sign.isPending ? "Signing…" : "Have the app sign for me"}
              </Button>
              {signature ? (
                <dl className="mt-3 space-y-1 text-xs">
                  <SignatureRow
                    label="signature"
                    value={truncateAddress(signature.signature)}
                  />
                  <SignatureRow
                    label="signed by"
                    value={truncateAddress(signature.signer)}
                  />
                  {/* The provenance line: a region and a server clock the
                      browser could not have produced. */}
                  <SignatureRow
                    label="signed on"
                    value={`${signature.server} · ${clockTime(signature.signedAt)}`}
                  />
                </dl>
              ) : null}
              <ErrorMessage error={sign.error} className="mt-3" />
            </>
          ) : null}
        </SettingsRowCard>

        <ErrorMessage error={statusError ?? delegate.error ?? revoke.error} />
      </div>
    </WidgetCard>
  );
}

function stateTitle(state: DelegationState): string {
  switch (state) {
    case "delegated":
      return "This app can sign for you";
    case "revoking":
      return "Removing access…";
    case "delegating":
      return "Granting access…";
    default:
      return "This app cannot sign for you";
  }
}

/** Wall-clock from the server's own timestamp, e.g. "20:34:12". */
function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour12: false });
}

/** "just now" / "4 minutes ago" / "2 days ago". Coarse on purpose. */
function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const units: [number, string][] = [
    [60, "minute"],
    [3600, "hour"],
    [86400, "day"],
  ];
  let label = "minute";
  let value = seconds / 60;
  for (const [divisor, name] of units) {
    if (seconds >= divisor) {
      label = name;
      value = seconds / divisor;
    }
  }
  const rounded = Math.floor(value);
  return `${rounded} ${label}${rounded === 1 ? "" : "s"} ago`;
}

function stateDetail(state: DelegationState, signedAt?: string): string {
  // One truncated line each: the row is a scannable stack, and the wide
  // "Allow" button leaves the least room of any state.
  switch (state) {
    case "delegated":
      // For a permission that signs while the user is away, when it last did
      // so is the thing they want to know. This session only - the server
      // records it, but nothing asks the server any more.
      return signedAt
        ? `Last signed ${timeAgo(signedAt)}.`
        : "It can sign while you are away.";
    case "delegating":
      return "Adding a delegated signer.";
    case "revoking":
      return "Removing the delegated signer.";
    default:
      return "Allow it to sign while you are away.";
  }
}

function SignatureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-(--brand-muted)">{label}</dt>
      <dd className="font-mono text-(--brand-fg)">{value}</dd>
    </div>
  );
}
