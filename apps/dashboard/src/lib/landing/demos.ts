/**
 * Landing page demo catalog.
 *
 * Checked-in source of truth for the public landing page at `/` and the
 * detail pages at `/demos/[slug]`. Deployment URLs are filled in as demos
 * get public domains; a missing `url` renders as "Coming soon".
 */

import { getDemoCatalogEntry, type DemoCategory } from "@dynamic-demos/ui/demo-catalog";

import type { DemoConfigKind } from "@/lib/services/types";

/**
 * Public name/tagline/url/visibility come from the shared catalog so the
 * landing cards and every demo app's nav grid render the same words.
 * Throws rather than falling back: a typo'd slug must fail the build, not
 * silently ship a card with no name.
 */
function catalogEntry(slug: string) {
  const entry = getDemoCatalogEntry(slug);
  if (!entry) throw new Error(`no demo-catalog entry for slug "${slug}"`);
  return entry;
}

export interface LandingDemo {
  /** Unique, used for /demos/[slug]. */
  slug: string;
  name: string;
  /** One-liner for the card. */
  tagline: string;
  /** Longer copy for the detail page. */
  description: string;
  category: DemoCategory;
  /** Live deployment; absent → "Coming soon". */
  url?: string;
  /** Publicly listed on the landing page + /demos/[slug]; hidden demos stay operator-only. */
  showOnLanding: boolean;
  /** Operator demo-config kind this entry launches; absent for standalone showcase apps. */
  kind?: DemoConfigKind;
  /** Feature bullets for the detail page. */
  highlights: string[];
  /** Dynamic features + providers powering the demo - "Under the hood" chips. */
  stack: string[];
  /** Docs and open-source example links for building it yourself. */
  resources: { label: string; url: string }[];
}

export const LANDING_DEMOS: LandingDemo[] = [
  {
    ...catalogEntry("wallet"),
    kind: "wallet",
    description:
      "Give users a self-custodial wallet they access with just an email or social login - no seed phrases required. They can view balances across multiple chains, sign transactions, and send funds by scanning a recipient's QR code. Built entirely on Dynamic, it's the cleanest way to make the wallet itself the product.",
    highlights: [
      "Email and social login, no seed phrase",
      "Multichain balances and native transfers",
      "Scan-to-send with QR recipient capture",
      "Onchain signing with secure API access",
    ],
    stack: [
      "Embedded MPC wallets",
      "Email + social login",
      "Multichain balances",
      "JWT-protected APIs",
    ],
    resources: [
      {
        label: "Embedded wallets docs",
        url: "https://www.dynamic.xyz/docs/overview/wallets/overview",
      },
      {
        label: "Open-source example: embedded wallet with the JS SDK",
        url: "https://github.com/dynamic-labs-oss/examples/tree/main/examples/nextjs-js-sdk-wallet-demo",
      },
    ],
  },
  {
    ...catalogEntry("connections"),
    kind: "connections",
    description:
      "A hosted page you point users at instead of building a wallet picker per platform - no wallet SDK in your app. They pick from 600+ wallets (extension, QR, or mobile deeplink) and land back on your callback with their public address. Run the same engine headless inside a native app and the wallet can sign messages and transactions too. Embeds in an iframe or a webview.",
    highlights: [
      "600+ wallets: extension, QR, and mobile deeplink",
      "No wallet SDK in your app",
      "Sign messages and transactions from native headless hosts",
      "Returns the address to your own redirect_uri",
      "Embeddable in an iframe or native webview",
    ],
    stack: [
      "EIP-6963 wallet discovery",
      "WalletConnect + deeplinks",
      "Per-prospect theming",
      "Headless engine for native hosts",
    ],
    resources: [
      {
        label: "Connecting external wallets docs",
        url: "https://www.dynamic.xyz/docs/javascript/building-ui/connecting-external-wallets",
      },
    ],
  },
  {
    ...catalogEntry("accounts"),
    kind: "accounts",
    description:
      "Business accounts put an embedded wallet under a team instead of a person. Create an account, mint wallets it owns outright, then add co-signers so more than one person signs from the same wallet. Administrative reach stays separate from signing authority: an admin manages the roster but cannot sign, a signer signs but cannot manage. Fits company treasuries, B2B platforms provisioning customer wallets, supervised consumer accounts, and agent-assisted wallets.",
    highlights: [
      "Owner / admin / viewer roles, distinct from signing rights",
      "Co-signers share one wallet - two people, the same address",
      "Mint wallets the account owns outright",
      "Sensitive changes gated behind step-up verification",
    ],
    stack: [
      "Business Accounts (early access)",
      "Dynamic embedded wallets",
      "Scoped elevated access tokens",
      "Per-prospect theming",
    ],
    // No resources yet: the JavaScript reference pages for Business Accounts
    // are unpublished, and the API-reference links read as internal.
    resources: [],
  },
  {
    ...catalogEntry("trade"),
    kind: "trade",
    description:
      "A multi-surface trading experience where users sign in, browse live token markets and event markets, and execute swaps. A single portfolio view unifies trading, earning, and prediction positions side by side. Onchain swaps route through Dynamic-backed orchestration for a seamless execution flow.",
    highlights: [
      "Live token and prediction markets",
      "Onchain token swaps and spot trades",
      "Unified cross-product portfolio view",
      "Email and social login",
    ],
    stack: [
      "Embedded wallets",
      "CoinGecko market data",
      "Polymarket event markets",
      "Onchain swaps",
    ],
    resources: [],
  },
  {
    ...catalogEntry("earn"),
    kind: "earn",
    description:
      "A yield experience where users sign in, deposit USDC into curated vaults, and track their positions over time. Deposits and withdrawals are user-signed onchain transactions, so funds stay fully in the user's control. A single deployment can power many branded vault experiences.",
    highlights: [
      "Curated USDC yield vaults",
      "User-signed onchain deposits and withdrawals",
      "Positions dashboard with saved vaults",
      "Email, Google, and SSO login",
    ],
    stack: [
      "Embedded wallets",
      "USDC vault deposits",
      "User-signed transactions",
      "Email, Google + SSO login",
    ],
    resources: [
      {
        label: "Embedded wallets docs",
        url: "https://www.dynamic.xyz/docs/overview/wallets/overview",
      },
    ],
  },
  {
    ...catalogEntry("flow"),
    kind: "flow",
    description:
      "An interactive showcase for Dynamic's Flow product. Accept any crypto from any source - external wallet, exchange, embedded wallet, or vault - and settle in any stablecoin at any destination. Checkout, deposit, and withdraw scenarios run on the same SDK lifecycle: swap the source or destination and the same call keeps working.",
    highlights: [
      "Any crypto in, stablecoins out",
      "Sources: wallets, exchanges, vaults",
      "Checkout, deposit, and withdraw scenarios",
      "One SDK call, swappable endpoints",
    ],
    stack: [
      "Deposit with crypto (Flow)",
      "Sources: wallets, exchanges, vaults",
      "Stablecoin settlement",
      "Embedded wallets",
    ],
    resources: [
      {
        label: "Flow documentation",
        url: "https://www.dynamic.xyz/docs/overview/fireblocks-flow",
      },
    ],
  },
  {
    ...catalogEntry("remittance"),
    kind: "remittance",
    description:
      "A cross-border remittance experience where a sender funds USDC onchain and pays out fiat to recipients across Latin America. Payouts settle to local bank rails - PIX in Brazil, SPEI in Mexico, PSE in Colombia, and more. Users track each transfer from send to delivery with live status updates.",
    highlights: [
      "USDC in, local fiat out",
      "PIX, SPEI, PSE, and ACH rails",
      "Recipient and corridor selection",
      "Live payout status tracking",
    ],
    stack: [
      "Embedded wallets",
      "Onchain USDC funding",
      "PIX, SPEI, PSE, CBU + ACH rails",
    ],
    resources: [
      {
        label: "Embedded wallets docs",
        url: "https://www.dynamic.xyz/docs/overview/wallets/overview",
      },
    ],
  },
  {
    ...catalogEntry("stablecoin-card"),
    kind: "card",
    description:
      "A stablecoin-backed debit card experience where users sign in with email or a social login and get an embedded smart wallet - no seed phrases, no gas fees. They apply for a card and receive an instant virtual Visa debit card, then fund it with USDC straight from their wallet. Card balance and full transaction activity live in one view, so spending onchain dollars feels like using any banking app.",
    highlights: [
      "Instant virtual Visa debit card",
      "Fund the card with USDC from your wallet",
      "Gasless transactions via embedded smart wallets",
      "Card balance and transaction history in one view",
    ],
    stack: [
      "Embedded smart wallets",
      "Gasless transactions",
      "Virtual Visa card",
      "USDC funding",
    ],
    resources: [
      {
        label: "Embedded wallets docs",
        url: "https://www.dynamic.xyz/docs/overview/wallets/overview",
      },
      {
        label: "Open-source example: this demo's full source",
        url: "https://github.com/dynamic-labs-oss/examples/tree/main/examples/nextjs-stablecoin-card-rain",
      },
    ],
  },
  {
    ...catalogEntry("checkouts"),
    kind: "checkout",
    description:
      "A configurable checkout widget where end users deposit or purchase with crypto inside a host app. Branded per prospect from the dashboard; internal-only until it gets a public domain.",
    highlights: [
      "Embeddable payment widget",
      "Crypto deposits and purchases",
      "Per-prospect branding from the dashboard",
    ],
    stack: ["Embedded wallets", "Checkout widget", "Per-prospect theming"],
    resources: [],
  },
  {
    ...catalogEntry("visa-direct"),
    kind: "visa-direct",
    description:
      "A payout experience where Fireblocks Liquidity pushes USDC-funded payments to bank accounts and embedded wallets in near real time. Branded per prospect from the dashboard.",
    highlights: [
      "Real-time stablecoin payouts",
      "Bank and wallet destinations",
      "Fireblocks custody + compliance",
    ],
    stack: ["Fireblocks Liquidity", "USDC funding", "Fireblocks custody"],
    resources: [],
  },
];

export function getDemoByKind(kind: DemoConfigKind): LandingDemo | undefined {
  return LANDING_DEMOS.find((demo) => demo.kind === kind);
}

/** Internal operator demo-detail route id - kind when present, else the slug. */
export function demoDetailId(demo: LandingDemo): string {
  return demo.kind ?? demo.slug;
}

export function getDemoBySlug(slug: string): LandingDemo | undefined {
  // Hidden demos 404 publicly - detail pages must never resolve them.
  return LANDING_DEMOS.find((demo) => demo.slug === slug && demo.showOnLanding);
}
