/**
 * Prospect → synthesized demo-config payload.
 *
 * Lets `?theme=` accept a Prospect id (or borrow the prospect behind a
 * config of a different kind): when the kind-scoped config lookup
 * misses, the GET handler synthesizes the kind's inner payload straight
 * from the Prospect's visual identity. No DemoConfig row required - a
 * prospect themes every demo the moment it exists.
 */

import { hydrateProspectTheme, prospectLogoUrl } from "./prospect-hydration";

import type { DemoConfigKind, Prospect } from "../types";

/**
 * Kinds whose stored shape puts the foreground color under `foreground`
 * and the logo URL under `branding.logo` (string). The rest use
 * `foregroundColor` + `branding.logoUrl` - mirrors each kind's mapper.
 */
const URL_LOGO_KINDS: ReadonlySet<DemoConfigKind> = new Set([
  "wallet",
  "checkout",
]);

export function synthesizeProspectConfig(
  kind: DemoConfigKind,
  prospect: Prospect,
): { theme: Record<string, unknown>; branding: Record<string, unknown> } {
  const urlLogo = URL_LOGO_KINDS.has(kind);
  const theme = hydrateProspectTheme<Record<string, unknown>>(
    prospect,
    undefined,
    null,
    { foregroundKey: urlLogo ? "foreground" : "foregroundColor" },
  );
  const logoUrl = prospectLogoUrl(prospect) ?? prospect.logoUrl ?? undefined;
  // Card consumes a WidgetConfig: `foregroundColor` theme + base branding
  // (`name` + `logoUrl`) - see apps/card/app/layout.tsx.
  if (kind === "card") {
    return {
      theme: theme ?? {},
      branding: { ...(logoUrl != null && { logoUrl }), name: prospect.name },
    };
  }
  const branding = urlLogo
    ? { ...(logoUrl != null && { logo: logoUrl }), name: prospect.name }
    : { ...(logoUrl != null && { logoUrl }), appName: prospect.name };
  return { theme: theme ?? {}, branding };
}
