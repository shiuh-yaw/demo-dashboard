/**
 * Public landing-card binding for the shared demo illustrations. The drawings
 * live in `@dynamic-demos/ui/demo-illustrations` (one source, also consumed by
 * the operator dashboard and the OG unfurl image); this file only supplies the
 * public palette and the slug lookup.
 *
 * The dashboard landing has no `--brand-*` tokens, so the public surface keeps
 * its literal white/slate values (accent #4779FF) rather than reading the
 * operator's `--di-*` custom properties.
 */

import {
  LIGHT_ILLUSTRATION_TONES,
  getDemoIllustration as getSharedIllustration,
  type DemoIllustration,
} from "@dynamic-demos/ui/demo-illustrations";
import type { ReactElement } from "react";

/** Binds a shared drawing to the public palette + a distinct gradient-id namespace. */
function withLightTones(Illustration: DemoIllustration): () => ReactElement {
  return function LandingIllustration() {
    return (
      <Illustration
        tones={LIGHT_ILLUSTRATION_TONES}
        idPrefix="ill"
        className="block"
      />
    );
  };
}

export const WalletIllustration = withLightTones(getSharedIllustration("wallet"));
export const TradeIllustration = withLightTones(getSharedIllustration("trade"));
export const EarnIllustration = withLightTones(getSharedIllustration("earn"));
export const FlowIllustration = withLightTones(getSharedIllustration("flow"));
export const RemittanceIllustration = withLightTones(getSharedIllustration("remittance"));
export const StablecoinCardIllustration = withLightTones(
  getSharedIllustration("stablecoin-card"),
);
const ConnectIllustration = withLightTones(getSharedIllustration("connections"));
const AccountsIllustration = withLightTones(getSharedIllustration("accounts"));

/**
 * Slug -> illustration lookup for the landing demos. Resolve through
 * `getDemoIllustration` so unknown slugs fall back safely.
 */
export const DEMO_ILLUSTRATIONS: Record<string, () => ReactElement> = {
  connections: ConnectIllustration,
  accounts: AccountsIllustration,
  wallet: WalletIllustration,
  trade: TradeIllustration,
  earn: EarnIllustration,
  flow: FlowIllustration,
  remittance: RemittanceIllustration,
  "stablecoin-card": StablecoinCardIllustration,
  checkouts: FlowIllustration,
  "visa-direct": StablecoinCardIllustration,
};

export function getDemoIllustration(slug: string): () => ReactElement {
  return DEMO_ILLUSTRATIONS[slug] ?? WalletIllustration;
}
