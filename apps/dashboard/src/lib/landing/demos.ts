/**
 * Landing page demo catalog.
 *
 * Checked-in source of truth for the public landing page at `/` and the
 * detail pages at `/demos/[slug]`. Deployment URLs are filled in as demos
 * get public domains; a missing `url` renders as "Coming soon".
 */

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
  /** Feature bullets for the detail page. */
  highlights: string[];
  /** Dynamic features + providers powering the demo — "Under the hood" chips. */
  stack: string[];
  /** Docs and open-source example links for building it yourself. */
  resources: { label: string; url: string }[];
}

export const LANDING_DEMOS: LandingDemo[] = [
  {
    slug: "wallet",
    name: "Wallet",
    tagline: "A non-custodial embedded wallet your users control.",
    description:
      "Give users a self-custodial wallet they access with just an email or social login — no seed phrases required. They can view balances across multiple chains, sign transactions, and send funds by scanning a recipient's QR code. Built entirely on Dynamic, it's the cleanest way to make the wallet itself the product.",
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
    name: "Earn",
    tagline: "Deposit USDC into curated yield vaults in a few taps.",
    description:
      "A yield experience where users sign in, deposit USDC into curated vaults, and track their positions over time. Deposits and withdrawals are user-signed onchain transactions, so funds stay fully in the user's control. A single deployment can power many branded vault experiences.",
    category: "wallet",
    url: "https://demo-earn-dynamic-xyz.vercel.app",
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
    name: "Flow",
    tagline: "Accept any crypto from any source, settle in stablecoins anywhere.",
    description:
      "An interactive showcase for Dynamic's Flow product. Accept any crypto from any source — external wallet, exchange, embedded wallet, or vault — and settle in any stablecoin at any destination. Checkout, deposit, and withdraw scenarios run on the same SDK lifecycle: swap the source or destination and the same call keeps working.",
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
    name: "Remittance",
    tagline: "Send stablecoins onchain, deliver fiat to bank accounts abroad.",
    description:
      "A cross-border remittance experience where a sender funds USDC onchain and pays out fiat to recipients across Latin America. Payouts settle to local bank rails — PIX in Brazil, SPEI in Mexico, PSE in Colombia, and more. Users track each transfer from send to delivery with live status updates.",
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
    slug: "proceeds",
    name: "Proceeds",
    tagline: "Convert onchain proceeds to your bank account.",
    description:
      "A merchant experience for moving onchain revenue into fiat. Merchants connect their Dynamic wallet, review balances and full transaction history, and offramp USDC to their bank. Supports US ACH and wire, EU SEPA, and UK Faster Payments.",
    category: "offramp",
    url: "https://demo-proceeds-dynamic-xyz.vercel.app",
    highlights: [
      "USDC to fiat payouts",
      "ACH, wire, SEPA, Faster Payments",
      "Balances and transaction history",
      "Quote, sign, submit, and track",
    ],
    stack: [
      "Dynamic wallet connect",
      "USDC to fiat offramp",
      "ACH, wire, SEPA + Faster Payments",
    ],
    resources: [
      {
        label: "Embedded wallets docs",
        url: "https://www.dynamic.xyz/docs/overview/wallets/overview",
      },
    ],
  },
];

export function getDemoBySlug(slug: string): LandingDemo | undefined {
  return LANDING_DEMOS.find((demo) => demo.slug === slug);
}
