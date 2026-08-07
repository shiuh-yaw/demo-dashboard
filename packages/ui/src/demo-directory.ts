/**
 * Cross-demo directory - the entries behind the SiteHeader's "Demos"
 * hover grid, so any scenario page can jump straight to another demo.
 *
 * Mirrors the public catalog (apps/dashboard/src/lib/landing/demos.ts,
 * the canonical list - keep name/tagline/url in sync when the catalog
 * changes). Apps can override via SiteHeader's `demos` prop.
 */

export interface DemoDirectoryEntry {
  name: string;
  tagline: string;
  href: string;
}

export const DEMO_DIRECTORY: DemoDirectoryEntry[] = [
  {
    name: "Wallet",
    tagline: "A non-custodial embedded wallet your users control.",
    href: "https://wallet.dynamic.dev",
  },
  {
    name: "Connections",
    tagline: "Bring any of 600+ wallets your users already have.",
    href: "https://connections.dynamic.dev",
  },
  {
    name: "Accounts",
    tagline: "One wallet, many signers - admin reach kept separate.",
    href: "https://accounts.dynamic.dev",
  },
  {
    name: "Trade",
    tagline: "Trade tokens and prediction markets from one portfolio.",
    href: "https://trade.dynamic.dev",
  },
  {
    name: "Earn",
    tagline: "Deposit USDC into curated yield vaults in a few taps.",
    href: "https://earn.dynamic.dev",
  },
  {
    name: "Flow",
    tagline: "Accept any crypto, settle in stablecoins anywhere.",
    href: "https://flow.dynamic.dev",
  },
  {
    name: "Remittance",
    tagline: "Send stablecoins onchain, deliver fiat to banks abroad.",
    href: "https://remittance.dynamic.dev",
  },
  {
    name: "Stablecoin Card",
    tagline: "A virtual Visa debit card funded by stablecoins.",
    href: "https://card.dynamic.dev",
  },
];
