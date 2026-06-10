"use client";

/**
 * Deposit demo slot. Renders a "Top up your balance" platform card
 * with a "Deposit funds" CTA; clicking the CTA mounts `<CheckoutWidget />`
 * configured for the deposit lifecycle (mode=deposit, no fixed amount
 * — the user picks). The destination is the platform's embedded
 * wallet for the user, so `hideDestination` stays off and the buyer
 * sees where their funds will land.
 *
 * Configuration via env (optional — a sandbox Checkout id is baked
 * in so the slot works out-of-the-box):
 *   NEXT_PUBLIC_DYNAMIC_DEPOSIT_CHECKOUT_ID  — pre-created deposit Flow id
 *     (falls back to NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID, then the demo id)
 */

import { useState } from "react";
import { env } from "@/lib/env";
import { BackButton } from "@/components/back-button";
import { ExchangeCheckoutWidget } from "@/components/exchange-checkout-widget";
import { ScenarioCard } from "@/components/scenario-card";
import { USDC_BASE } from "@/lib/tokens";
import { BalanceIllustration } from "./balance-illustration";
import { hasPendingExchangeRedirect } from "@/lib/exchanges";

// Default Checkout id for the deposit demo. Sandbox-provisioned; the
// merchant Checkout works fine for this purpose because the `mode`
// field on the Flow drives the wire shape — destinations override is
// per-transaction.
const CHECKOUT_ID =
  env.NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID ?? "5c5930ef-5de5-4fd5-826e-4d7668f49fb3";

// TODO: TEMPORARY — placeholder embedded wallet address. The deposit
// destination should be the user's actual platform-managed wallet,
// derived after their first SIWE handshake. Replace once the platform
// session is wired.
const DEMO_EMBEDDED_WALLET_ADDRESS =
  "0x5C260969b90152a46D52BC476C94524C8E796b3d";

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

  return (
    <div className="w-full max-w-[440px] mx-auto lg:mx-0">
      {depositing ? (
        <WidgetStage onBack={() => setDepositing(false)} />
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
// =============================================================================

function WidgetStage({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <BackButton onClick={onBack} label="Back to platform" />
      <ExchangeCheckoutWidget
        // Widget's own "Powered by" + "Terms / Privacy" footers are
        // suppressed because apps/flow renders its own legal close at
        // the end of <TransactionDisclaimer /> (see disclaimer.tsx).
        hidePoweredBy
        hideLegalLinks
        checkoutId={CHECKOUT_ID}
        destinationToken={USDC_BASE}
        // TODO: TEMPORARY — see `DEMO_EMBEDDED_WALLET_ADDRESS` above.
        destinationAddress={DEMO_EMBEDDED_WALLET_ADDRESS}
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
        // same embedded wallet address.
        exchangeDestinationAddress={DEMO_EMBEDDED_WALLET_ADDRESS}
        exchangeSettlementChain="EVM"
        exchangeSettlementChainId={8453}
      />
    </div>
  );
}

