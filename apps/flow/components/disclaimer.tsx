/**
 * Legal disclaimers surfaced across the demo.
 *
 * Two variants — different audience, different placement:
 *
 *   - `<TransactionDisclaimer />` — short integrator-facing note on
 *     what the integrator's app needs to disclose to ITS end-users
 *     (third-party routing, self-custody, on-chain finality). Renders
 *     directly under the widget on each scenario route so the
 *     disclosure copy sits next to the surface the integrator is
 *     about to copy-paste.
 *
 *   - `<FullDisclaimer />` — comprehensive page-level footnote: routing
 *     risk, rate volatility, "not financial advice", the "Fireblocks
 *     Flow is infrastructure" framing, terms-and-conditions link.
 *     Sits at the bottom of every page (landing + the three scenario
 *     routes). The landing-page hero's cite mark scrolls here via
 *     `#disclaimer`.
 *
 * The two variants are intentionally styled differently:
 *
 *   - FullDisclaimer is a page-level section — top border rule,
 *     uppercase brand-primary eyebrow, lead sentence with quiet
 *     emphasis, body broken into short paragraphs.
 *   - TransactionDisclaimer is a widget-adjacent note — small muted
 *     eyebrow, no border rule, narrower width to match the widget
 *     column, no section-level top spacing.
 */

import type { ReactNode } from "react";

/** Stable id used by the landing page's cite link to scroll here. */
export const FULL_DISCLAIMER_ANCHOR = "disclaimer";

const TERMS_HREF = "https://www.dynamic.xyz/terms-conditions";

/**
 * Anchor styling shared by both disclaimer variants. Subtle muted
 * underline that brightens to brand-fg on hover — discoverable
 * without competing with body text.
 */
const INLINE_LINK_CLASS =
  "underline underline-offset-2 hover:text-(--brand-fg) transition-colors";

/**
 * Small superscript cite mark that scrolls to the page's
 * `<FullDisclaimer />`. Drop inside any prose where a claim about
 * Fireblocks Flow as infrastructure deserves the legal context —
 * landing-page hero, scenario-page subtitles, etc.
 *
 * Renders as `[†]` in brand-primary at 0.6em, with the
 * slide-on-hover underline treatment used by the other docs-link
 * affordances in the panel.
 */
export function DisclaimerCite() {
  return (
    <sup>
      <a
        href={`#${FULL_DISCLAIMER_ANCHOR}`}
        aria-label="See disclaimer"
        className="ml-0.5 text-[0.6em] font-medium text-(--brand-primary) hover:text-(--brand-primary-hover) hover:underline underline-offset-2 transition-colors"
      >
        [†]
      </a>
    </sup>
  );
}

// =============================================================================
// FullDisclaimer — page-level footnote
// =============================================================================

/**
 * Page-level section wrapper used by `<FullDisclaimer />`. Top border
 * rule + uppercase brand-primary eyebrow + section-level top spacing.
 * `scroll-mt-*` keeps the cite-anchor jump from pinning the eyebrow
 * to the very top of the viewport.
 */
function FullDisclaimerSection({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="mt-16 lg:mt-20 pt-8 border-t border-(--brand-border) scroll-mt-8"
    >
      <div className="flex flex-col gap-5">
        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-(--brand-primary)">
          Disclaimer
        </span>
        {children}
      </div>
    </section>
  );
}

/**
 * Long-form disclaimer for every page. Anchored at `#disclaimer` so
 * the cite mark in the landing-page hero subtitle can jump straight
 * here.
 *
 * Layout hierarchy:
 *   1. "DISCLAIMER" eyebrow
 *   2. Three short paragraphs covering the risk surfaces, separated
 *      by `gap-3` so each clause feels distinct.
 *   3. Closing sentence with the terms-and-conditions link.
 */
export function FullDisclaimer() {
  return (
    <FullDisclaimerSection id={FULL_DISCLAIMER_ANCHOR}>
      <div className="flex flex-col gap-3 text-[12px] leading-relaxed text-(--brand-muted)">
        <p>
          Dynamic does not control the swap, bridge, or routing
          protocols used to convert and deliver assets. Rates and fees
          are sourced from third-party providers and may change between
          quote and execution.
        </p>
        <p>
          Cross-chain transfers carry risk — including slippage,
          partial fills, and failed conversions. On-chain transactions
          are final and cannot be reversed.
        </p>
        <p>
          These materials are not investment, financial, legal, or tax
          advice. You are responsible for evaluation at your own
          discretion. Please review{" "}
          <a
            href={TERMS_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={INLINE_LINK_CLASS}
          >
            Dynamic&apos;s terms and conditions
          </a>{" "}
          for full details on acceptable use.
        </p>
      </div>
    </FullDisclaimerSection>
  );
}

// =============================================================================
// TransactionDisclaimer — widget-adjacent integrator note
// =============================================================================

/**
 * Short integrator-facing note rendered directly under the widget on
 * each scenario route, closing with the Terms-of-Service / Privacy
 * Policy line that the widget package would otherwise emit on its
 * own. Render this alongside `hideLegalLinks` on the widget so the
 * closing line appears once, at the end of the disclaimer.
 *
 * No eyebrow, no border — just quiet muted prose. The first
 * paragraph is the integrator-facing reminder about third-party
 * routing, self-custody, and on-chain finality; the second is the
 * user-facing legal close.
 */
export function TransactionDisclaimer() {
  return (
    <div className="mt-3 w-full max-w-[440px] mx-auto lg:mx-0 px-1 flex flex-col gap-2 text-[11px] leading-relaxed text-(--brand-muted)">
      <p>
        Your application should make clear to end-users that asset
        conversion and cross-chain routing are executed by independent
        third-party providers. Users keep full control of their assets
        and must explicitly sign each transfer. On-chain transactions
        are final and cannot be reversed.
      </p>
      <p>
        By continuing, you agree to our{" "}
        <a
          href={TERMS_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className={INLINE_LINK_CLASS}
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="https://www.dynamic.xyz/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className={INLINE_LINK_CLASS}
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
