/**
 * Operator-surface binding for the shared demo illustrations. The drawings
 * themselves live in `@dynamic-demos/ui/demo-illustrations` (one source, also
 * consumed by the public landing and the OG unfurl image); this file only
 * supplies the operator palette and the slug lookup.
 *
 * The operator tones are `var(--di-*)` custom properties defined under
 * `[data-surface="operator"]` in globals.css (light + dark), so the artwork
 * recolors with the operator surface and the public surface is unaffected.
 */

import {
  OPERATOR_ILLUSTRATION_TONES,
  getDemoIllustration,
  type DemoIllustration,
} from "@dynamic-demos/ui/demo-illustrations";
import type { ReactElement } from "react";

/** Binds a shared drawing to the operator palette + a distinct gradient-id namespace. */
function withOperatorTones(Illustration: DemoIllustration): () => ReactElement {
  return function OperatorIllustration() {
    return <Illustration tones={OPERATOR_ILLUSTRATION_TONES} idPrefix="op-ill" />;
  };
}

export const WalletIllustration = withOperatorTones(getDemoIllustration("wallet"));
export const ConnectIllustration = withOperatorTones(getDemoIllustration("connections"));
export const AccountsIllustration = withOperatorTones(getDemoIllustration("accounts"));
export const TradeIllustration = withOperatorTones(getDemoIllustration("trade"));
export const EarnIllustration = withOperatorTones(getDemoIllustration("earn"));
export const FlowIllustration = withOperatorTones(getDemoIllustration("flow"));
export const RemittanceIllustration = withOperatorTones(getDemoIllustration("remittance"));
export const StablecoinCardIllustration = withOperatorTones(
  getDemoIllustration("stablecoin-card"),
);

/** Slug -> operator illustration; unknown slugs fall back to Wallet. */
export const OPERATOR_DEMO_ILLUSTRATIONS: Record<string, () => ReactElement> = {
  wallet: WalletIllustration,
  connections: ConnectIllustration,
  accounts: AccountsIllustration,
  trade: TradeIllustration,
  earn: EarnIllustration,
  flow: FlowIllustration,
  remittance: RemittanceIllustration,
  "stablecoin-card": StablecoinCardIllustration,
  checkouts: FlowIllustration,
  "visa-direct": StablecoinCardIllustration,
  exchange: TradeIllustration,
};

export function getOperatorDemoIllustration(slug: string): () => ReactElement {
  return OPERATOR_DEMO_ILLUSTRATIONS[slug] ?? WalletIllustration;
}
