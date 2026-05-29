"use client";

/**
 * Top-level shell after the user taps "Continue to platform" on the
 * landing card. Owns the wallet provisioning lifecycle:
 *
 *   - Sync rehydration of an existing Dynamic session on mount, with
 *     a 500ms bounded fallback so a stuck SDK never leaves the user
 *     staring at a spinner.
 *   - Picker → connect → external-wallet capture → WaaS provisioning
 *     for first-time visitors.
 *   - Provisioning success → hand off to AuthenticatedShell (which
 *     owns balances + sub-flow routing).
 *   - Provisioning failure → ProvisionErrorPanel with a retry that
 *     re-runs WaaS provisioning without re-prompting the picker.
 *
 * Two wallet identities are tracked across the session:
 *
 *   wallet (embedded SOL WaaS) — "platform wallet" identity surfaced
 *     on the dashboard. WithdrawSubFlow uses this as its source.
 *     DepositSubFlow uses its ADDRESS as the destination for incoming
 *     funds.
 *
 *   externalWallet (Phantom/MetaMask/Fireblocks/etc.) — the wallet
 *     the user signed in through. DepositSubFlow uses this as the
 *     source of funds (deposits pay FROM this wallet INTO the
 *     embedded one). Required for the deposit flow to read the
 *     user's actual on-chain balances rather than the embedded
 *     wallet's empty balance sheet.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { WalletPickerScreen } from "@dynamic-demos/checkouts-widget";
import { Button, WidgetCard } from "@dynamic-demos/ui";
import { BackButton } from "@/components/back-button";
import {
  ensureSolEmbeddedWallet,
  getPrimaryWalletAccount,
  isSignedIn,
  offEvent,
  onEvent,
  type WalletAccount,
} from "@/lib/dynamic/flow-sdk";
import { AuthenticatedShell } from "./authenticated-shell";

export function PlatformShell({ onBack }: { onBack: () => void }) {
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [externalWallet, setExternalWallet] = useState<WalletAccount | null>(
    null,
  );
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  // Initial brief loading window while we check for an existing
  // session on mount (see the rehydration effect below). After the
  // check resolves — either by adopting a session OR by giving up and
  // falling back to the picker — this flips false. Bounded by a
  // setTimeout so we never spin forever if the SDK never reports a
  // verdict.
  const [initializing, setInitializing] = useState(true);

  // Tracks whether we've already kicked off the boot sequence
  // (provisionEmbedded + setExternalWallet). Protects against the
  // `walletAccountsChanged` listener double-firing after the user
  // signs in via the picker, OR the SDK's eager rehydration racing
  // with the synchronous mount-time check. Ref instead of state so
  // it's immediately readable inside the same render's listeners.
  const bootStartedRef = useRef(false);

  // Ensure the platform embedded wallet exists for the signed-in user.
  // Per Dynamic's WaaS docs, `createWaasWalletAccounts` must be called
  // explicitly after auth — it is not automatic.
  // See: docs/javascript/reference/waas/creating-waas-wallet-accounts
  const provisionEmbedded = useCallback(async () => {
    setInitializing(false);
    setProvisioning(true);
    setProvisionError(null);
    try {
      setWallet(await ensureSolEmbeddedWallet());
    } catch (e) {
      setProvisionError(
        e instanceof Error
          ? e.message
          : "Could not provision an embedded wallet.",
      );
    } finally {
      setProvisioning(false);
    }
  }, []);

  // Connect handler: after the user signs in through any provider
  // (Phantom/MetaMask/Fireblocks/etc.), capture that external wallet
  // (it's the deposit source) AND ensure the embedded wallet exists.
  const handleConnected = useCallback(
    async (connectedExternalWallet: WalletAccount) => {
      bootStartedRef.current = true;
      setExternalWallet(connectedExternalWallet);
      await provisionEmbedded();
    },
    [provisionEmbedded],
  );

  // Rehydrate from an existing Dynamic session on mount. If the user
  // is already signed in (returning visitor, refreshed tab) the picker
  // never appears — we adopt the primary wallet account and boot the
  // dashboard. Without this, clicking the same wallet again in the
  // picker triggers the SDK's `connectAndVerifyWithWalletProvider` on
  // an already-verified account and surfaces the "Wallet account …
  // is already verified" error.
  //
  // IMPORTANT: rehydration requires a *verified* session, not just a
  // connected wallet. The SDK's `isSignedIn()` returns true whenever
  // ANY wallet is in state (verified or not) — see
  // `Boolean(client.user || getWalletAccounts(client).length > 0)` in
  // the SDK source. Using it alone causes a false positive when the
  // user arrived from `/checkout` or `/deposit` (connect-only,
  // `verifyOnConnect={false}`): the unverified wallet leaks into
  // `/withdraw`'s state, rehydration adopts it, and
  // `createWaasWalletAccounts` fails inside the SDK with
  // "Session ID is required" because `core.state.get().user` is
  // undefined. Gate on `verifiedCredentialId` so only genuinely
  // verified accounts trigger provisioning.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const tryRehydrate = () => {
      if (cancelled || bootStartedRef.current) return;
      if (!isSignedIn()) return;
      const account = getPrimaryWalletAccount();
      if (!account?.verifiedCredentialId) return;
      bootStartedRef.current = true;
      setExternalWallet(account);
      void provisionEmbedded();
    };

    // Synchronous fast path — SDK has usually rehydrated by mount.
    tryRehydrate();

    // Async fallback — the SDK can finish rehydrating after React
    // mounts. Re-run on every wallet-account update until we
    // successfully boot or unmount.
    const listener = () => tryRehydrate();
    onEvent({ event: "walletAccountsChanged", listener });

    // Bounded grace period — if we still haven't booted after 500ms,
    // give up on rehydration and show the picker so the user isn't
    // stuck looking at a spinner.
    const timer = window.setTimeout(() => {
      if (!cancelled) setInitializing(false);
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      offEvent({ event: "walletAccountsChanged", listener });
    };
  }, [provisionEmbedded]);

  // Retry hook for the error panel — the user is already signed in
  // and we've already captured their external wallet, so we just
  // re-run the WaaS provisioning step without sending them back to
  // the picker.
  const handleRetry = provisionEmbedded;

  // Pre-auth / pre-provisioning: render the picker (or its
  // intermediate states) until we have an embedded wallet to anchor
  // on. Split out from AuthenticatedShell so the balance hook below
  // only runs once we actually have a wallet to query.
  if (!wallet) {
    let inner: React.ReactNode;
    if (initializing || provisioning) {
      // Initial session check + WaaS provisioning share the same
      // spinner — both states represent "we're about to land on the
      // dashboard, just need a moment."
      inner = <ProvisioningPanel />;
    } else if (provisionError) {
      inner = (
        <ProvisionErrorPanel message={provisionError} onRetry={handleRetry} />
      );
    } else {
      inner = (
        <div className="px-5 py-5">
          <WalletPickerScreen
            verifyOnConnect={true}
            // Default `preferredChain="EVM"` (the SDK's recommended
            // default). The auth chain is decoupled from the
            // embedded wallet chain — we always mint a SOL embedded
            // WaaS wallet in `handleConnected` regardless of which
            // chain the user signed in through. Forcing SOL here
            // broke connect for any wallet whose multi-chain
            // provider didn't have a SOL account approved for this
            // origin (Phantom without SOL on this origin, Fireblocks
            // vault without a SOL account, etc.); the SDK then
            // throws `NoAddressFoundError` from the empty addresses.
            onConnected={handleConnected}
            header={
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-(--brand-muted) font-medium">
                  Sign in
                </span>
                <h3 className="text-base font-semibold text-(--brand-fg) tracking-[-0.01em]">
                  Connect to your platform wallet
                </h3>
              </div>
            }
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <BackButton onClick={onBack} label="Back to platform" />
        <WidgetCard className="overflow-hidden">{inner}</WidgetCard>
      </div>
    );
  }

  // Post-auth: hand off to the balance-aware shell. externalWallet is
  // passed alongside the embedded one so the deposit subflow can pay
  // FROM it.
  return (
    <AuthenticatedShell
      walletAccount={wallet}
      externalWalletAccount={externalWallet}
      onLeavePlatform={onBack}
    />
  );
}

// =============================================================================
// Provisioning panels — visible while we mint the user's platform
// embedded wallet (or when minting fails).
// =============================================================================

function ProvisioningPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 min-h-[16rem] text-center">
      <div className="w-9 h-9 rounded-full border-2 border-(--brand-border) border-t-(--brand-primary) animate-spin" />
      <p className="text-sm font-medium text-(--brand-fg)">
        Setting up your platform wallet…
      </p>
      <p className="text-xs text-(--brand-muted) max-w-[30ch]">
        Provisioning an embedded wallet you control. This only happens the first
        time you sign in.
      </p>
    </div>
  );
}

function ProvisionErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 min-h-[14rem] text-center">
        <div className="w-9 h-9 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold">
          !
        </div>
        <p className="text-sm font-medium text-(--brand-fg)">
          Could not set up your platform wallet
        </p>
        <p className="text-xs text-(--brand-muted) max-w-[34ch]">
          {message}
        </p>
      </div>
      <div className="flex gap-[7px] px-5 py-3 border-t border-(--brand-border)">
        <Button onClick={onRetry} className="flex-1">
          Try again
        </Button>
      </div>
    </div>
  );
}
