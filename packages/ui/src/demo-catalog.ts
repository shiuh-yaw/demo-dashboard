/**
 * Canonical demo copy - the ONE place a demo's public name, tagline and
 * deployment URL are written.
 *
 * This lives in `packages/ui` rather than the dashboard because both sides
 * need it and neither can import the other: the dashboard renders the public
 * landing cards and `/demos/[slug]`, while every demo app renders the
 * SiteHeader's "Demos" grid. Previously each kept its own copy and they
 * drifted (four taglines diverged, two demos were missing from the nav).
 *
 * Anything demo-specific but NOT public-facing presentation - config kind,
 * highlights, stack, resources, long descriptions - stays in the dashboard's
 * `LANDING_DEMOS`, which builds on these entries by slug.
 */

/** Presentation grouping - the only thing it controls is the band tint. */
export type DemoCategory = "wallet" | "checkout" | "offramp";

export interface DemoCatalogEntry {
  /** Unique; the dashboard's `/demos/[slug]` route id. */
  slug: string;
  /** Public product name. Must match what the app itself calls the demo. */
  name: string;
  /** One-line benefit statement. The single wording used on cards and nav. */
  tagline: string;
  /** Live deployment; absent → "Coming soon", and omitted from the nav grid. */
  url?: string;
  /** Publicly listed; hidden demos stay operator-only and never reach the nav. */
  showOnLanding: boolean;
  /** Drives the hero-band tint on the landing card AND the OG unfurl. */
  category: DemoCategory;
}

export const DEMO_CATALOG: DemoCatalogEntry[] = [
  {
    slug: "wallet",
    category: "wallet",
    name: "Wallet",
    tagline: "A non-custodial embedded wallet your users control.",
    url: "https://wallet.dynamic.dev",
    showOnLanding: true,
  },
  {
    slug: "connections",
    category: "wallet",
    name: "Connections",
    tagline: "Bring any of 600+ wallets your users already have.",
    url: "https://connections.dynamic.dev",
    showOnLanding: true,
  },
  {
    slug: "accounts",
    category: "wallet",
    name: "Accounts",
    tagline: "A wallet your users share. One team, many signers.",
    url: "https://accounts.dynamic.dev",
    showOnLanding: true,
  },
  {
    slug: "trade",
    category: "wallet",
    name: "Trade",
    tagline: "Trade tokens and prediction markets from one unified portfolio.",
    url: "https://trade.dynamic.dev",
    showOnLanding: true,
  },
  {
    slug: "earn",
    category: "wallet",
    name: "Earn",
    tagline: "Deposit USDC into curated yield vaults in a few taps.",
    url: "https://earn.dynamic.dev",
    showOnLanding: true,
  },
  {
    slug: "flow",
    category: "checkout",
    name: "Flow",
    tagline: "Accept any crypto from any source, settle in stablecoins anywhere.",
    url: "https://flow.dynamic.dev",
    showOnLanding: true,
  },
  {
    slug: "remittance",
    category: "offramp",
    name: "Remittance",
    tagline: "Send stablecoins onchain, deliver fiat to bank accounts abroad.",
    url: "https://remittance.dynamic.dev",
    showOnLanding: true,
  },
  {
    slug: "stablecoin-card",
    category: "offramp",
    name: "Stablecoin Card",
    tagline: "A virtual Visa debit card funded by stablecoins in your wallet.",
    url: "https://card.dynamic.dev",
    showOnLanding: true,
  },
  {
    slug: "checkouts",
    category: "checkout",
    name: "Checkouts",
    tagline: "Embedded payment widget for crypto deposits and purchases.",
    url: "https://dynamic-checkouts.vercel.app",
    showOnLanding: false,
  },
  {
    slug: "visa-direct",
    category: "offramp",
    name: "Fireblocks Liquidity",
    tagline: "Stablecoin payouts to bank accounts and embedded wallets.",
    url: "https://demo-visa-direct.vercel.app",
    showOnLanding: false,
  },
];

export function getDemoCatalogEntry(slug: string): DemoCatalogEntry | undefined {
  return DEMO_CATALOG.find((demo) => demo.slug === slug);
}

/** Category accent - the saturated tint each hero band is mixed from. */
export const CATEGORY_ACCENTS: Record<DemoCategory, string> = {
  wallet: "#4779FF",
  checkout: "#8b5cf6",
  offramp: "#10b981",
};

/**
 * `CATEGORY_ACCENTS` at 14% over white, precomputed.
 *
 * The web bands express this as `color-mix(in srgb, <accent> 14%, #ffffff)`,
 * which satori cannot parse - so the OG unfurl reads these literals instead.
 * Keep the two in step: same accents, same 14%, same result.
 */
export const CATEGORY_BAND_FROM: Record<DemoCategory, string> = {
  wallet: "#E5ECFF",
  checkout: "#EFE8FE",
  offramp: "#DEF5ED",
};

/**
 * Band stops for the full-bleed OG card (accent at 11% and 2%).
 *
 * Deliberately LIGHTER than the landing's 14% start: a landing card shows
 * the band as a short h-44 strip, whereas here it covers all 1200x630, and
 * the same tint spread over that much area reads far heavier. The 2% end
 * still keeps a trace of color behind the artwork rather than bleaching to
 * pure white, which is what leaves the illustration's white panel with
 * nothing to sit against.
 */
export const OG_BAND_FROM: Record<DemoCategory, string> = {
  wallet: "#EBF0FF",
  checkout: "#F2EDFE",
  offramp: "#E5F7F1",
};

export const OG_BAND_TO: Record<DemoCategory, string> = {
  wallet: "#FBFCFF",
  checkout: "#FDFCFF",
  offramp: "#FAFEFC",
};
