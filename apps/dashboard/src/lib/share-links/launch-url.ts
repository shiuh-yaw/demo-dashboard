/**
 * Demo launch URL builder. The demo catalog (`lib/landing/demos.ts`) is the
 * single source of base URLs per config kind; `NEXT_PUBLIC_DEMO_URL_OVERRIDES`
 * (optional JSON, e.g. `{"earn":"http://localhost:4002"}`) overrides per kind
 * for local dev and for kinds without a public domain yet.
 */

import { env } from "@/env";

import { getDemoByKind } from "@/lib/landing/demos";
import type { DemoConfigKind } from "@/lib/services/types";

function parseOverrides(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === "string"),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Base deployment URL for a demo kind; null when neither override nor catalog knows it. */
export function launchBaseUrl(kind: DemoConfigKind): string | null {
  const overrides = parseOverrides(env.NEXT_PUBLIC_DEMO_URL_OVERRIDES);
  return overrides[kind] ?? getDemoByKind(kind)?.url ?? null;
}

/**
 * Branded + tracked launch URL: `?share=<token>&theme=<themeId>`. `themeId`
 * is either the demoConfigId (bound configs - the config's own bound
 * prospect wins) or the share link's own prospectId (unbound configs - the
 * link's prospect supplies the theme). See the mint coherence rule in
 * `lib/actions/share-links.ts`. Throws when the kind has no base URL -
 * `/s/[token]` catches and falls back per the never-a-dead-link rule.
 */
export function buildBrandedLaunchUrl(
  kind: DemoConfigKind,
  token: string,
  themeId: string,
): string {
  const base = launchBaseUrl(kind);
  if (!base) throw new Error(`no launch URL configured for kind: ${kind}`);
  const url = new URL(base);
  url.searchParams.set("share", token);
  url.searchParams.set("theme", themeId);
  return url.toString();
}

/**
 * Plain launch URL: unbranded, untracked - the dead-link-safe fallback for
 * a demo we can still identify (revoked/expired token).
 */
export function buildPlainLaunchUrl(kind: DemoConfigKind): string {
  const base = launchBaseUrl(kind);
  if (!base) throw new Error(`no launch URL configured for kind: ${kind}`);
  return base;
}

/**
 * Themed launch/preview URL for operator surfaces ("Open Demo" links, config
 * editor preview links): `<baseUrl>/?theme=<id>`. No share token - distinct
 * from `buildBrandedLaunchUrl`, which is for `/s/[token]` redirects. Empty
 * string when the kind has no base URL - operator surfaces render falsy
 * URLs as "Not created"/disabled.
 */
export function demoThemeUrl(kind: DemoConfigKind, themeId: string): string {
  const base = launchBaseUrl(kind);
  return base ? `${base}/?theme=${themeId}` : "";
}

/**
 * "View demo" URL for generic (unbranded) surfaces - the demo-detail header's
 * launch button/host link and the demo catalog cards. Appends an EMPTY
 * `theme=` to the catalog base URL so the demo app clears any theme persisted
 * from a previous branded (share-link) visit and renders its default
 * appearance, rather than reusing the last prospect's branding. Empty string
 * for a nullish base (callers already guard on `demo.url`).
 */
export function clearThemeUrl(baseUrl: string | null | undefined): string {
  return baseUrl ? `${baseUrl}/?theme=` : "";
}
