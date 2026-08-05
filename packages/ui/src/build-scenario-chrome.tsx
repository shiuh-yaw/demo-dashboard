/**
 * The scenario chrome contract, as one call instead of five things to remember.
 *
 * Every demo hand-assembled the same five pieces around `ScenarioLayout`: the
 * marketing header for the unbranded state, the brand row for the branded one,
 * the prospect logo inside it, the theme-reset control, and the shared footer.
 * Nothing tied them together, so demos shipped with different subsets missing,
 * caught by eye, one demo at a time - a branded page with no header at all
 * (dropping `SiteHeader` without adding the brand row), a sticky theme with no
 * way out, a hand-rolled footer.
 *
 * The coupling that matters and that types alone can't express: `header` and
 * `heroLogo` are two halves of ONE decision. Exactly one renders, depending on
 * `isBranded`. Returning them together from a single input is what makes
 * "branded, but headerless" unrepresentable.
 *
 * Server-safe: this only builds elements, so a Server Component can call it.
 * `ResetThemeButton` is a client leaf and stays one.
 *
 * Enforced by `scenario-chrome-contract.test.ts` in @dynamic-demos/theme, which
 * scans every app composing `ScenarioLayout`. A demo that skips a piece fails
 * that suite rather than waiting for someone to notice on screen.
 */

import type { ReactNode } from "react";

import { ResetThemeButton } from "./reset-theme-button";
import { ScenarioBrandImage, ScenarioBrandRow } from "./scenario-brand";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export interface ScenarioChromeInput {
  /** Demo name for the marketing header's breadcrumb chip (unbranded only). */
  chip: string;
  /** Is a prospect config active for this request? */
  isBranded: boolean;
  /**
   * The app's own config-aware logo island (e.g. `<ScenarioBrandLogo />`), for
   * apps that read the logo from a client context rather than server-side.
   * Takes precedence over `brandLogoUrl`.
   */
  brandLogo?: ReactNode;
  /**
   * Prospect logo URL, when the page already has it server-side. Note the stored
   * key is `logoUrl`, not `logo` - `WidgetBranding` declares the latter, and
   * reading it yields `undefined` at runtime.
   */
  brandLogoUrl?: string;
  /** Render the logo above the widget instead of in the hero (wallet's widget scope). */
  logoPlacement?: "hero" | "widget";
  /**
   * Replaces the Dynamic mark in the UNBRANDED header, for a demo presented under
   * a product brand of its own (flow, connections -> `<FlowMark />`). Distinct
   * from `brandLogo`/`brandLogoUrl`, which are the *prospect* mark in the branded
   * hero row: this is the permanent site identity, that one is per-request.
   */
  siteLogo?: ReactNode;
  /** Where the header logo links. Defaults to SiteHeader's own home href. */
  siteLogoHref?: string;
}

export interface ScenarioChrome {
  /** `ScenarioLayout`'s `header`. Undefined when branded - the brand row replaces it. */
  header: ReactNode;
  /** `ScenarioHero`'s `logo`. Undefined when unbranded. */
  heroLogo: ReactNode;
  /**
   * `ScenarioLayout`'s `footer`, carrying the theme-reset link. There is no
   * separate `reset` slot: the footer links row is the ONE place Clear theme
   * belongs across every demo, so the helper doesn't offer a way to put it
   * anywhere else.
   */
  footer: ReactNode;
}

export function buildScenarioChrome({
  chip,
  isBranded,
  brandLogo,
  brandLogoUrl,
  logoPlacement = "hero",
  siteLogo,
  siteLogoHref,
}: ScenarioChromeInput): ScenarioChrome {
  const logo =
    !isBranded || logoPlacement !== "hero"
      ? undefined
      : (brandLogo ??
        (brandLogoUrl ? (
          <ScenarioBrandImage src={brandLogoUrl} align="start" />
        ) : undefined));

  return {
    header: isBranded ? undefined : (
      <SiteHeader chip={chip} logo={siteLogo} logoHref={siteLogoHref} />
    ),
    // The row renders even with no logo: it carries the Book a call CTA, and a
    // prospect without a logo still needs the CTA and the row's spacing.
    heroLogo: isBranded ? <ScenarioBrandRow logo={logo} /> : undefined,
    // Clear theme rides the footer's links row - `variant="link"` is styled for
    // exactly that slot. Renders nothing when unbranded.
    footer: (
      <SiteFooter
        extraLinks={<ResetThemeButton active={isBranded} variant="link" />}
      />
    ),
  };
}
