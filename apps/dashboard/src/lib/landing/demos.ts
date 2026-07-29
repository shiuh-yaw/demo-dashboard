/**
 * Landing page demo catalog.
 *
 * Checked-in source of truth for the public landing page at `/` and the
 * detail pages at `/demos/[slug]`. Deployment URLs are filled in as demos
 * get public domains; a missing `url` renders as "Coming soon".
 */

import type { DemoConfigKind } from "@/lib/services/types";

export interface LandingDemo {
  /** Unique, used for /demos/[slug]. */
  slug: string;
  name: string;
  /** One-liner for the card. */
  tagline: string;
  /** Longer copy for the detail page. */
  description: string;
  category: "wallet" | "checkout" | "offramp";
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
    slug: "wallet",
    showOnLanding: true,
    kind: "wallet",
    name: "Wallet",
    tagline: "A non-custodial embedded wallet your users control.",
    description:
      "Give users a self-custodial wallet they access with just an email or social login - no seed phrases required. They can view balances across multiple chains, sign transactions, and send funds by scanning a recipient's QR code. Built entirely on Dynamic, it's the cleanest way to make the wallet itself the product.",
    category: "wallet",
    url: "https://wallet.dynamic.dev",
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
    slug: "trade",
    showOnLanding: true,
    kind: "trade",
    name: "Trade",
    tagline: "Trade tokens and prediction markets from one unified portfolio.",
    description:
      "A multi-surface trading experience where users sign in, browse live token markets and event markets, and execute swaps. A single portfolio view unifies trading, earning, and prediction positions side by side. Onchain swaps route through Dynamic-backed orchestration for a seamless execution flow.",
    category: "wallet",
    url: "https://trade.dynamic.dev",
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
    slug: "earn",
    showOnLanding: true,
    kind: "earn",
    name: "Earn",
    tagline: "Deposit USDC into curated yield vaults in a few taps.",
    description:
      "A yield experience where users sign in, deposit USDC into curated vaults, and track their positions over time. Deposits and withdrawals are user-signed onchain transactions, so funds stay fully in the user's control. A single deployment can power many branded vault experiences.",
    category: "wallet",
    url: "https://earn.dynamic.dev",
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
    slug: "flow",
    kind: "flow",
    showOnLanding: true,
    name: "Flow",
    tagline: "Accept any crypto from any source, settle in stablecoins anywhere.",
    description:
      "An interactive showcase for Dynamic's Flow product. Accept any crypto from any source - external wallet, exchange, embedded wallet, or vault - and settle in any stablecoin at any destination. Checkout, deposit, and withdraw scenarios run on the same SDK lifecycle: swap the source or destination and the same call keeps working.",
    category: "checkout",
    url: "https://flow.dynamic.dev",
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
    slug: "remittance",
    showOnLanding: true,
    kind: "remittance",
    name: "Remittance",
    tagline: "Send stablecoins onchain, deliver fiat to bank accounts abroad.",
    description:
      "A cross-border remittance experience where a sender funds USDC onchain and pays out fiat to recipients across Latin America. Payouts settle to local bank rails - PIX in Brazil, SPEI in Mexico, PSE in Colombia, and more. Users track each transfer from send to delivery with live status updates.",
    category: "offramp",
    url: "https://remittance.dynamic.dev",
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
    slug: "stablecoin-card",
    kind: "card",
    showOnLanding: true,
    name: "Stablecoin Card",
    tagline: "A virtual Visa debit card funded by stablecoins in your wallet.",
    description:
      "A stablecoin-backed debit card experience where users sign in with email or a social login and get an embedded smart wallet - no seed phrases, no gas fees. They apply for a card and receive an instant virtual Visa debit card, then fund it with USDC straight from their wallet. Card balance and full transaction activity live in one view, so spending onchain dollars feels like using any banking app.",
    category: "offramp",
    url: "https://card.dynamic.dev",
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
    slug: "checkouts",
    showOnLanding: false,
    kind: "checkout",
    name: "Checkouts",
    tagline: "Embedded payment widget for crypto deposits and purchases.",
    description:
      "A configurable checkout widget where end users deposit or purchase with crypto inside a host app. Branded per prospect from the dashboard; internal-only until it gets a public domain.",
    category: "checkout",
    url: "https://dynamic-checkouts.vercel.app",
    highlights: [
      "Embeddable payment widget",
      "Crypto deposits and purchases",
      "Per-prospect branding from the dashboard",
    ],
    stack: ["Embedded wallets", "Checkout widget", "Per-prospect theming"],
    resources: [],
  },
  {
    slug: "visa-direct",
    showOnLanding: false,
    kind: "visa-direct",
    name: "Fireblocks MTLco",
    tagline: "Stablecoin payouts to bank accounts, debit cards, and embedded wallets.",
    description:
      "A payout experience where Fireblocks MTLco uses Visa Direct to push USDC-funded payments to bank accounts, Visa cards, and embedded wallets in near real time. Branded per prospect from the dashboard.",
    category: "offramp",
    url: "https://demo-visa-direct.vercel.app",
    highlights: [
      "Push payouts via Visa Direct",
      "Bank, card, and wallet destinations",
      "Fireblocks custody + compliance",
    ],
    stack: ["Visa Direct payouts", "USDC funding", "Fireblocks custody"],
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
