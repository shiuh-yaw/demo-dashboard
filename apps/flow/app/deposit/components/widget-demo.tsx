"use client";

/**
 * Deposit demo slot. Renders a "Top up your balance" platform card
 * with a "Deposit funds" CTA; clicking the CTA mounts `<CheckoutWidget />`
 * configured for the deposit lifecycle (mode=deposit, no fixed amount
 * — the user picks). The destination is the wallet that originates
 * the transaction — i.e. the connected wallet's own address — so the
 * deposited USDC lands back in the same account the user funded from.
 *
 * Configuration via env (optional — a sandbox Checkout id is baked
 * in so the slot works out-of-the-box):
 *   NEXT_PUBLIC_DYNAMIC_DEPOSIT_CHECKOUT_ID  — pre-created deposit Flow id
 *     (falls back to NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID, then the demo id)
 */

import { useCallback, useState } from "react";
import { env } from "@/lib/env";
import { BackButton } from "@/components/back-button";
import { ExchangeCheckoutWidget } from "@/components/exchange-checkout-widget";
import { ScenarioCard } from "@/components/scenario-card";
import { useTestnetMode } from "@/components/testnet-toggle";
import { USDC_BASE, USDC_ARB_SEPOLIA } from "@/lib/tokens";
import { isTestnetSupportedToken } from "@/lib/testnet";
import { useTestnetCheckout } from "@/lib/use-testnet-checkout";
import type { TokenAsset } from "@dynamic-demos/checkouts-widget";
import { BalanceIllustration } from "./balance-illustration";
import { hasPendingExchangeRedirect } from "@/lib/exchanges";
import { logout } from "@/lib/dynamic/flow-sdk";

// Default Checkout id for the deposit demo. Sandbox-provisioned; the
// merchant Checkout works fine for this purpose because the `mode`
// field on the Flow drives the wire shape — destinations override is
// per-transaction.
const CHECKOUT_ID =
  env.NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID ?? "5c5930ef-5de5-4fd5-826e-4d7668f49fb3";

/** Check if the current URL contains Dynamic OAuth redirect params. */
function isOAuthRedirectUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("dynamicOauthCode");
}

export function DepositWidgetDemo() {
  // Auto-mount the widget when returning from an OAuth redirect so the
  // exchange flow can resume. Without this, the widget never mounts and
  // the redirect params go unprocessed.
  const [depositing, setDepositing] = useState(
    () => hasPendingExchangeRedirect() || isOAuthRedirectUrl(),
  );
  const { isTestnet, toggle: toggleTestnet } = useTestnetMode();

  return (
    <div className="w-full max-w-[440px] mx-auto lg:mx-0">
      {depositing ? (
        <WidgetStage onBack={() => setDepositing(false)} isTestnet={isTestnet} onToggleTestnet={toggleTestnet} />
      ) : (
        <ScenarioCard
          eyebrow="Platform balance"
          title="Top up your account"
          body="Fund your balance from any wallet on any chain. Flow swaps it to USDC and credits your platform wallet."
          ctaLabel="Deposit funds"
          onCta={() => setDepositing(true)}
          illustration={<BalanceIllustration />}
        />
      )}
    </div>
  );
}

// =============================================================================
// Widget stage — wraps <CheckoutWidget /> in deposit mode.
// The destination address is resolved dynamically: once the user
// connects a wallet, that wallet's address becomes the destination
// (funds are deposited back to the originating wallet).
// =============================================================================

function WidgetStage({
  onBack,
  isTestnet,
  onToggleTestnet,
}: {
  onBack: () => void;
  isTestnet: boolean;
  onToggleTestnet: () => void;
}) {
  const [walletAddress, setWalletAddress] = useState("");

  const {
    checkoutId: testnetCheckoutId,
    loading: testnetLoading,
    error: testnetError,
  } = useTestnetCheckout({ isTestnet, mode: "deposit" });

  const tokenFilter = useCallback(
    (token: TokenAsset) =>
      isTestnet
        ? isTestnetSupportedToken(token.chainId, token.symbol)
        : true,
    [isTestnet],
  );

  const effectiveCheckoutId = isTestnet && testnetCheckoutId ? testnetCheckoutId : CHECKOUT_ID;
  const effectiveDestinationToken = isTestnet ? USDC_ARB_SEPOLIA : USDC_BASE;
  const effectiveSettlementChainId = isTestnet ? 421614 : 8453;

  const handleDisconnect = useCallback(() => {
    setWalletAddress("");
    logout();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} label="Back to platform" />

      </div>
      {testnetLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-[var(--brand-muted,#99a0ae)]">
          Creating testnet checkout…
        </div>
      ) : testnetError && isTestnet ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-red-500">{testnetError}</p>
          <p className="text-xs text-[var(--brand-muted,#99a0ae)]">DYNAMIC_API_TOKEN may not be configured</p>
        </div>
      ) : (
      <ExchangeCheckoutWidget
        hidePoweredBy
        hideLegalLinks
        skipAutoConnect
        onDisconnect={handleDisconnect}
        checkoutId={effectiveCheckoutId}
        destinationToken={effectiveDestinationToken}
        tokenFilter={tokenFilter}
        // Testnet tokens have no real market price (marketValue=0),
        // so the amount-derived USD floor would hide them all. Skip
        // the filter entirely when in testnet mode.
        skipMinUsdValueFilter={isTestnet}
        // Destination = the connected wallet's own address. Resolved
        // dynamically once the user connects; the widget's internal
        // PaymentWidget only consumes this after wallet + token
        // selection, so it's always populated by the time it's needed.
        onWalletConnected={setWalletAddress}
        destinationAddress={walletAddress}
        destinationChain="EVM"
        currency="USD"
        // No `amount` — the user picks how much to deposit from the
        // preset row + freeform input.
        presetAmounts={[25, 50, 100, 250]}
        // Low-value testing for the demo — accept down to $0.10 so
        // the sandbox flow can be exercised without big balances.
        minAmount={0.1}
        // Deposit: ask "how much?" first, THEN connect a wallet +
        // pick a token. Users frame deposits by amount, not by token.
        amountFirst
        mode="deposit"
        // Deposit lands in the user's OWN wallet — show the destination
        // row so they can verify before signing.
        // (hideDestination defaults to false; documenting for clarity.)
        // Connect-only — funding the platform doesn't need SIWE;
        // the user signs the actual deposit tx anyway.
        verifyOnConnect={false}
        // Exchange-specific: exchange withdrawals settle to the
        // connected wallet's address on Base. Pass undefined when no
        // wallet is connected so the widget can guard against empty
        // destinations (the ?? in handleConfirmTransfer falls through).
        exchangeDestinationAddress={walletAddress || undefined}
        exchangeSettlementChain="EVM"
        exchangeSettlementChainId={effectiveSettlementChainId}
      />
      )}
    </div>
  );
}

