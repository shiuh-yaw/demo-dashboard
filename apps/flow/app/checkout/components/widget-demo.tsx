"use client";

/**
 * Checkout demo slot. Renders a mock product card with a "Pay with
 * crypto" CTA; clicking the CTA boots the Dynamic client, prompts the
 * buyer to connect a wallet, then mounts `<PaymentWidget />` from
 * `@dynamic-demos/checkouts-widget` against a pre-created Checkout id.
 *
 * The widget package is the same one apps/checkouts ships — we just
 * host it inside the demo's product page instead of its standalone
 * widget shell.
 *
 * The destination address is the connected wallet's own address — funds
 * settle back to the wallet that originated the transaction.
 *
 * Configuration via env (optional — a sandbox Checkout id is baked in
 * so the slot works out-of-the-box):
 *   NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID  — pre-created Checkout id
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
import { TicketIllustration } from "./ticket-illustration";
import { hasPendingExchangeRedirect } from "@/lib/exchanges";
import { logout } from "@/lib/dynamic/flow-sdk";

// Same-chain USDC-on-Base — no swap, no bridge. `needsConversion` /
// `isCrossChain` drive whether the widget's swap pre-flight + cross-
// chain polling kick in; both false for this demo's defaults.

// Default Checkout id for the demo. Created server-side in our sandbox;
// override per-environment by setting NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID.
const CHECKOUT_ID =
  env.NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID ?? "5c5930ef-5de5-4fd5-826e-4d7668f49fb3";

/** Check if the current URL contains Dynamic OAuth redirect params. */
function isOAuthRedirectUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("dynamicOauthCode");
}

export function CheckoutWidgetDemo() {
  // Auto-mount the widget when returning from an OAuth redirect so the
  // exchange flow can resume.
  const [paying, setPaying] = useState(
    () => hasPendingExchangeRedirect() || isOAuthRedirectUrl(),
  );
  const { isTestnet, toggle: toggleTestnet } = useTestnetMode();

  return (
    <div className="w-full max-w-[440px] mx-auto lg:mx-0">
      {paying ? (
        <WidgetStage onBack={() => setPaying(false)} isTestnet={isTestnet} onToggleTestnet={toggleTestnet} />
      ) : (
        <ScenarioCard
          eyebrow="Demo purchase"
          title="Backstage pass · Sample event"
          body="Tap below to launch the embedded Flow widget and watch the lifecycle in the code panel on the right."
          ctaLabel="Pay with crypto"
          onCta={() => setPaying(true)}
          illustration={<TicketIllustration />}
          trailingHeader={
            <span className="text-base font-semibold text-(--brand-fg) font-mono">
              $0.10
            </span>
          }
        />
      )}
    </div>
  );
}

// =============================================================================
// Widget stage — drops in <CheckoutWidget /> from the package, which owns
// the full connect → pick → pay flow. The destination address is resolved
// dynamically to the connected wallet's address (funds settle back to the
// wallet originating the transaction).
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
  } = useTestnetCheckout({ isTestnet, mode: "payment" });

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
        <BackButton onClick={onBack} label="Back to product" />

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
        amount="0.10"
        mode="payment"
        // Merchant checkout — buyers shouldn't see the settlement vault
        // address; it's the merchant's, not theirs.
        hideDestination
        // Buyer-side flow: token list is filtered to spendable assets.
        minUsdValue={0.1}
        // Connect-only — a checkout is a single-shot pay-with-crypto
        // interaction, no need to prove ownership of the source wallet
        // via SIWE. The user signs the actual settlement tx anyway.
        verifyOnConnect={false}
        // `onCancelled` is the widget's one-shot exit callback — it
        // fires both when the buyer aborts mid-flow AND when they
        // click "Done" on the success screen (see PaymentWidget's
        // `handleDismiss`). Wiring it to `onBack` returns the demo to
        // the product card on either path.
        onCancelled={onBack}
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

