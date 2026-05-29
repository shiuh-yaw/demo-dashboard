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
 * Configuration via env (optional — a sandbox Checkout id is baked in
 * so the slot works out-of-the-box):
 *   NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID  — pre-created Checkout id
 */

import { useState } from "react";
import { CheckoutWidget } from "@dynamic-demos/checkouts-widget";
import { env } from "@/lib/env";
import { BackButton } from "@/components/back-button";
import { ScenarioCard } from "@/components/scenario-card";
import { USDC_BASE } from "@/lib/tokens";
import { TicketIllustration } from "./ticket-illustration";

// Same-chain USDC-on-Base — no swap, no bridge. `needsConversion` /
// `isCrossChain` drive whether the widget's swap pre-flight + cross-
// chain polling kick in; both false for this demo's defaults.

// Default Checkout id for the demo. Created server-side in our sandbox;
// override per-environment by setting NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID.
const CHECKOUT_ID =
  env.NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID ?? "5c5930ef-5de5-4fd5-826e-4d7668f49fb3";

// TODO: TEMPORARY — using a placeholder destination address here so the
// SDK's createCheckoutTransaction call satisfies the API's address-format
// regex (^[A-Za-z0-9_]{18,100}$). The right long-term shape is to bake
// `destinationConfig.destinations` into the Checkout server-side at
// creation time, then drop this prop entirely. Replace before any non-
// internal demo.
const DEMO_DESTINATION_ADDRESS = "0x5C260969b90152a46D52BC476C94524C8E796b3d";

export function CheckoutWidgetDemo() {
  const [paying, setPaying] = useState(false);

  return (
    <div className="w-full max-w-[440px] mx-auto lg:mx-0">
      {paying ? (
        <WidgetStage onBack={() => setPaying(false)} />
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
// the full connect → pick → pay flow. Everything below the "Back to
// product" button is package-managed.
// =============================================================================

function WidgetStage({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <BackButton onClick={onBack} label="Back to product" />
      <CheckoutWidget
        // Widget's own "Powered by" + "Terms / Privacy" footers are
        // suppressed because apps/flow renders its own legal close at
        // the end of <TransactionDisclaimer /> (see disclaimer.tsx).
        hidePoweredBy
        hideLegalLinks
        checkoutId={CHECKOUT_ID}
        destinationToken={USDC_BASE}
        // TODO: TEMPORARY — see `DEMO_DESTINATION_ADDRESS` above. Drop
        // this prop once the Checkout has server-side destinations
        // configured.
        destinationAddress={DEMO_DESTINATION_ADDRESS}
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
      />
    </div>
  );
}

