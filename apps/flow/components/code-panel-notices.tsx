/**
 * One-line callouts that frame the body of each CodePanel tab.
 *
 * Each notice rides on the shared `PanelNotice` shell so the four
 * tabs (SDK / API / Webhooks / Helpers) read as a series — same
 * gradient pill, same eyebrow + body rhythm — rather than ad-hoc
 * boxes per tab.
 */

import type { ReactNode } from "react";

interface PanelNoticeProps {
  /** Primary uppercase eyebrow (brand-coloured). */
  eyebrow: string;
  /** Optional muted dot-separator suffix (e.g. "no testnets"). */
  eyebrowSuffix?: string;
  /** Body text under the eyebrow. */
  children: ReactNode;
}

function PanelNotice({ eyebrow, eyebrowSuffix, children }: PanelNoticeProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-(--brand-border) bg-gradient-to-br from-(--brand-row-bg) via-(--brand-row-bg) to-(--brand-surface) p-4 sm:p-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-(--brand-primary)">
            {eyebrow}
          </span>
          {eyebrowSuffix ? (
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-(--brand-muted)">
              · {eyebrowSuffix}
            </span>
          ) : null}
        </div>
        <p className="text-[13px] leading-relaxed text-(--brand-fg-secondary)">
          {children}
        </p>
      </div>
    </div>
  );
}

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
