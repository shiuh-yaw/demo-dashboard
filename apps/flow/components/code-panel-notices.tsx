/**
 * One-line callouts that frame the body of each CodePanel tab.
 *
 * Each notice rides the shared `PanelNotice` shell (packages/ui,
 * generalized from this file) so the four tabs (SDK / API / Webhooks /
 * Helpers) read as a series — same gradient pill, same eyebrow + body
 * rhythm — rather than ad-hoc boxes per tab.
 */

import { PanelNotice } from "@dynamic-demos/ui";

/**
 * SDK + REST tab notice. Flow runs against mainnet networks only —
 * integrators sometimes assume "sandbox env id = testnet" and waste a
 * cycle figuring it out, so we surface it at the top of both
 * integration tabs.
 */
export function MainnetOnlyNotice() {
  return (
    <PanelNotice eyebrow="Mainnet only" eyebrowSuffix="no testnets">
      Flow runs on mainnet networks only. Use a sandbox environment id with real
      mainnet addresses for development.
    </PanelNotice>
  );
}

/**
 * Helpers tab notice. Frames the cards below as standalone Dynamic
 * SDK calls — the SDK imports an integrator wires into their own UI
 * alongside the integration sequence — rather than a parallel
 * walkthrough.
 */
export function HelpersIntroNotice() {
  return (
    <PanelNotice eyebrow="SDK helpers" eyebrowSuffix="standalone calls">
      Optional Dynamic SDK imports you can wire into your own UI alongside the
      integration sequence.
    </PanelNotice>
  );
}

/**
 * Webhooks tab notice. Frames the cards below as the push-driven
 * alternative to polling the transaction endpoint — production apps
 * subscribe; the demo polls.
 */
export function WebhooksIntroNotice() {
  return (
    <PanelNotice eyebrow="Webhooks" eyebrowSuffix="push-driven settlement">
      Configure a webhook URL in your Dynamic dashboard and Dynamic POSTs each
      axis transition as it happens — the production replacement for the polling
      loop in step 05.
    </PanelNotice>
  );
}
