import Link from "next/link";
import {
  CoinbaseIcon,
  EthereumIcon,
  FireblocksIcon,
  MetaMaskIcon,
  PhantomIcon,
} from "@dynamic-labs/iconic";
import { DynamicWalletIcon } from "@/components/icons/dynamic-wallet";
import { DisclaimerCite, FullDisclaimer } from "@/components/disclaimer";
import { AnimatedFlowArrow, DocsArrow, RunChevron } from "./_client";

/**
 * Landing — three product cards (Checkout · Deposit · Withdraw) with
 * real-world example tags under each, followed by sources/destinations
 * and integration-paths sections.
 *
 * Self-contained server component. Plain styled divs (no Droplet Card
 * primitives because they ship as `"use client"` and trip RSC at the
 * landing tier).
 */
export default function Landing() {
  return (
    <div className="min-h-dvh bg-(--brand-page-bg)">
      <main className="mx-auto max-w-6xl px-6 pt-10 pb-24">
        <Hero />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SCENARIOS.map((scenario) => (
            <ScenarioCard key={scenario.href} {...scenario} />
          ))}
        </div>
        <SourcesAndDestinationsSection />
        <BuildPathsSection />
        <FullDisclaimer />
      </main>
    </div>
  );
}

function Hero() {
  return (
    <section className="flex flex-col gap-6 pb-12 lg:pb-16 max-w-3xl">
      <Link
        href="/"
        aria-label="Flow — home"
        className="inline-flex items-center self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-primary) focus-visible:ring-offset-2 rounded-md"
      >
        <FlowLogo />
      </Link>

      <h1 className="!text-[clamp(2rem,4vw,3rem)] !leading-[1.05] text-balance text-(--brand-fg) font-semibold tracking-[-0.02em]">
        Accept any crypto.{" "}
        <span className="text-(--brand-primary)">Settle any stablecoin.</span>
      </h1>
      <p className="text-base lg:text-lg text-(--brand-fg-secondary) max-w-xl">
        Three live scenarios — checkout, deposit, withdraw — built on
        Fireblocks Flow infrastructure<DisclaimerCite />. Run any of them
        in the browser and read the integration side-by-side.
      </p>
    </section>
  );
}

// =============================================================================
// SOURCES & DESTINATIONS
// =============================================================================

function SourcesAndDestinationsSection() {
  // Order locked per user direction:
  //   embedded wallet → fireblocks vault → external wallet → exchange
  const items: Array<{
    name: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      name: "Embedded wallet",
      description: "Dynamic-issued, non-custodial. Created in seconds.",
      icon: <DynamicWalletIcon size={40} />,
    },
    {
      name: "Fireblocks vault",
      description: "Custodial, merchant-controlled. Settlement-ready.",
      icon: <FireblocksIcon className="h-10 w-10" />,
    },
    {
      name: "External wallet",
      description: "MetaMask, Phantom, Coinbase Wallet, and 50+ more.",
      icon: <MetaMaskIcon className="h-10 w-10" />,
    },
    {
      name: "Centralized exchange",
      description: "Coinbase, Kraken, Crypto.com — OAuth-delegated.",
      icon: <CoinbaseIcon className="h-10 w-10" />,
    },
  ];

  return (
    <section className="mt-20 lg:mt-24">
      <SectionHeader
        eyebrow="Sources & destinations"
        title="Any source. Any destination."
        subtitle="A Flow connects one of these on either side of the swap. Pick a source for the sender; pick a destination for settlement."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex flex-col gap-4 rounded-2xl bg-(--brand-surface) border border-(--brand-border) p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[10px]">
              {item.icon}
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-(--brand-fg)">
                {item.name}
              </h3>
              <p className="text-xs leading-relaxed text-(--brand-fg-secondary)">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// BUILD PATHS
// =============================================================================

function BuildPathsSection() {
  // Two primary integration paths — you build with one (or both).
  // Webhooks is a complementary lifecycle feed, not a build path; it
  // gets its own subsection below.
  const paths: Array<{
    num: string;
    title: string;
    summary: string;
    bullets: string[];
    docHref: string;
    docLabel: string;
  }> = [
    {
      num: "01",
      title: "JavaScript SDK",
      summary:
        "Drop-in client for browser-based platforms. Handles wallet signing, broadcast, and settlement polling. The fastest path when your platform is a web app.",
      bullets: [
        "Best for web apps and React Native",
        "Wallet signing + broadcast handled for you",
        "Same primitives as the API, with less plumbing",
      ],
      docHref:
        "https://www.dynamic.xyz/docs/javascript/reference/client/checkout-flow",
      docLabel: "Read the SDK reference",
    },
    {
      num: "02",
      title: "REST API",
      summary:
        "Language-agnostic and server-side. Same lifecycle, full control over the surface — pick this when your client isn't a browser, or when an autonomous workflow needs to drive the flow.",
      bullets: [
        "Ideal for AI agents and autonomous workflows",
        "Use any backend language — JSON in, JSON out",
        "Webhook + polling coverage for every state change",
      ],
      docHref:
        "https://www.dynamic.xyz/docs/recipes/integrations/checkouts/checkout-api",
      docLabel: "Read the API recipe",
    },
  ];

  return (
    <section className="mt-16 lg:mt-20">
      <SectionHeader
        eyebrow="Build with Flow"
        title="Two ways to integrate."
        subtitle="Pick the surface that matches the platform you're embedding into. Both speak to the same underlying Flow primitives."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paths.map((path) => (
          <article
            key={path.num}
            className="flex flex-col gap-4 rounded-2xl bg-(--brand-surface) border border-(--brand-border) p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="text-xs font-mono text-(--brand-muted)">
                  {path.num}
                </span>
                <h3 className="text-base font-semibold text-(--brand-fg) truncate">
                  {path.title}
                </h3>
              </div>
              <a
                href={path.docHref}
                target="_blank"
                rel="noreferrer"
                aria-label={path.docLabel}
                title={path.docLabel}
                className="group/docs shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-(--brand-primary) hover:text-(--brand-primary-hover) transition-colors"
              >
                Docs
                <span className="transition-transform group-hover/docs:translate-x-0.5">
                  <DocsArrow />
                </span>
              </a>
            </div>

            <p className="text-sm leading-relaxed text-(--brand-fg-secondary)">
              {path.summary}
            </p>

            <ul
              className="flex flex-col gap-2 m-0 p-0"
              style={{ listStyle: "none" }}
            >
              {path.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2 text-xs text-(--brand-fg-secondary)"
                >
                  <BulletDot />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <WebhooksPanel />
    </section>
  );
}

/**
 * Webhooks is a lifecycle feed — it complements either of the two
 * integration paths above. Treated as a subsection (smaller eyebrow,
 * single full-width card, side-by-side copy + snippet) so it visually
 * reads as "and you'll likely want this too", not "third way to build".
 */
function WebhooksPanel() {
  return (
    <div className="mt-4 rounded-2xl bg-(--brand-surface) border border-(--brand-border) p-5">
      <div className="flex flex-col gap-3 max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-(--brand-muted) font-medium">
            Stay in sync
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-(--brand-row-bg) text-(--brand-muted) border border-(--brand-border)">
            Webhooks
          </span>
        </div>
        <h3 className="text-base font-semibold text-(--brand-fg)">
          React to the transaction lifecycle.
        </h3>
        <p className="text-sm leading-relaxed text-(--brand-fg-secondary)">
          Webhooks aren&apos;t a way to build — they&apos;re how you stay
          informed about transactions running through your Flow. HMAC-signed
          lifecycle events your server can subscribe to from either integration
          path above.
        </p>
        <ul
          className="flex flex-col gap-2 m-0 p-0"
          style={{ listStyle: "none" }}
        >
          {[
            "Execution state changes (created, submitted, confirmed, failed)",
            "Settlement state changes (in-progress, completed)",
            "Risk + compliance signals",
          ].map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-2 text-xs text-(--brand-fg-secondary)"
            >
              <BulletDot />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BulletDot() {
  return (
    <span
      aria-hidden
      className="mt-1.5 inline-block size-1 shrink-0 rounded-full bg-(--brand-primary)"
    />
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col gap-2 mb-8 max-w-2xl">
      <span className="text-[10px] uppercase tracking-[0.18em] text-(--brand-muted) font-medium">
        {eyebrow}
      </span>
      <h2 className="text-2xl lg:text-3xl font-semibold text-(--brand-fg) tracking-[-0.02em] leading-[1.1]">
        {title}
      </h2>
      <p className="text-sm lg:text-base text-(--brand-fg-secondary)">
        {subtitle}
      </p>
    </div>
  );
}

// DynamicWalletIcon was inlined here previously; moved to
// @/components/icons/dynamic-wallet so the scenario pages can use the
// same mark without duplicating the SVG.

function FlowLogo() {
  return (
    <svg
      width="160"
      height="46"
      viewBox="0 0 491 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="block"
    >
      <path
        d="M195.152 124V17.44H270.04V34.608H214.392V63.616H265.008V80.044H214.392V124H195.152ZM274.182 17.44H292.534V124H274.182V17.44ZM335.506 125.776C310.79 125.776 296.582 108.46 296.582 85.52C296.582 62.58 310.79 45.264 335.506 45.264C360.222 45.264 374.43 62.58 374.43 85.52C374.43 108.46 360.222 125.776 335.506 125.776ZM335.506 111.124C349.418 111.124 355.634 100.32 355.634 85.52C355.634 70.572 349.418 59.768 335.506 59.768C321.594 59.768 315.23 70.572 315.23 85.52C315.23 100.32 321.594 111.124 335.506 111.124ZM443.399 124L430.967 64.356L418.387 124H390.711L372.507 47.04H391.155L405.215 111.716L418.535 47.04H443.251L456.571 111.716L470.631 47.04H489.279L471.075 124H443.399Z"
        fill="#192A4D"
      />
      <path
        d="M119.583 0.478149H20.4167C9.14376 0.478149 0 9.6219 0 20.8948V120.061C0 131.334 9.14376 140.478 20.4167 140.478H119.583C130.856 140.478 140 131.334 140 120.061V20.8948C140 9.6219 130.856 0.478149 119.583 0.478149ZM95.5647 99.6448H44.4355C38.7917 99.6448 35.2917 93.5198 38.1501 88.6636L63.8315 44.9281C66.6605 40.1156 73.6167 40.1302 76.4165 44.9573L101.865 88.6927C104.694 93.549 101.18 99.6448 95.5647 99.6448Z"
        fill="#192A4D"
      />
    </svg>
  );
}

interface ScenarioCardProps {
  num: string;
  title: string;
  description: string;
  href: string;
  mockup: "checkout" | "deposit" | "withdraw";
  examples: string[];
}

const SCENARIOS: ScenarioCardProps[] = [
  {
    num: "01",
    title: "Checkout",
    description:
      "Buyers pay with any token on any chain. Merchant receives the configured stablecoin every time.",
    href: "/checkout",
    mockup: "checkout",
    examples: ["Marketplace", "Ecommerce", "Subscriptions", "Ticketing", "POS"],
  },
  {
    num: "02",
    title: "Deposit",
    description:
      "Users fund a platform balance from any wallet or centralized exchange. Settles to their embedded wallet or your Fireblocks vault.",
    href: "/deposit",
    mockup: "deposit",
    examples: [
      "Online casino",
      "Prediction market",
      "Sportsbook",
      "Trading platform",
      "Web3 gaming",
    ],
  },
  {
    num: "03",
    title: "Withdraw",
    description:
      "Cash out from a vault, embedded wallet, or external source to any user-chosen wallet and asset.",
    href: "/withdraw",
    mockup: "withdraw",
    examples: [
      "Affiliate payouts",
      "Creator earnings",
      "Gaming cashout",
      "Marketplace settlement",
      "Tournament prizes",
    ],
  },
];

function ScenarioCard({
  num,
  title,
  description,
  href,
  mockup,
  examples,
}: ScenarioCardProps) {
  return (
    <article className="flex flex-col gap-4">
      <Link
        href={href}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-primary) focus-visible:ring-offset-2 rounded-2xl"
      >
        <div className="flex flex-col rounded-2xl bg-(--brand-surface) border border-(--brand-border) shadow-[0_1px_3px_rgba(15,23,42,0.04)] group-hover:border-(--brand-primary) group-hover:shadow-[0_4px_16px_rgba(71,121,255,0.08)] transition-all overflow-hidden">
          <Mockup variant={mockup} />
          <div className="px-5 pt-5 pb-5 flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-mono text-(--brand-muted)">
                {num}
              </span>
              <h3 className="text-base font-semibold text-(--brand-fg)">
                {title}
              </h3>
              <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-medium text-(--brand-muted) group-hover:text-(--brand-primary) transition-colors">
                Run
                <RunChevron />
              </span>
            </div>
            <p className="text-sm leading-relaxed text-(--brand-fg-secondary)">
              {description}
            </p>
          </div>
        </div>
      </Link>

      <div className="flex flex-col gap-2 px-1">
        <span className="text-[10px] uppercase tracking-[0.16em] text-(--brand-muted) font-medium">
          Real-world use
        </span>
        <div className="flex flex-wrap gap-1.5">
          {examples.map((example) => (
            <span
              key={example}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-(--brand-surface) text-(--brand-fg-secondary) border border-(--brand-border)"
            >
              {example}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

/**
 * Mockup region inside each scenario card. HTML/CSS so text wraps
 * naturally (no SVG `<text>` cutoffs). Source and destination cards
 * are equal-width flex children with an icon + label stack; a thin
 * animated line + arrow connects them.
 */
function Mockup({ variant }: { variant: "checkout" | "deposit" | "withdraw" }) {
  const labels = MOCKUP_LABELS[variant];
  return (
    <div
      className="relative px-4 py-5 overflow-hidden min-h-[170px]"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 8%, var(--brand-surface)) 0%, var(--brand-surface) 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--brand-fg) 6%, transparent) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="relative flex items-stretch gap-2">
        <MockupSlot
          label="SOURCE"
          title={labels.source.title}
          detail={labels.source.detail}
          icon={labels.source.icon}
        />
        <ArrowConnector />
        <MockupSlot
          label="DESTINATION"
          title={labels.destination.title}
          detail={labels.destination.detail}
          icon={labels.destination.icon}
        />
      </div>
    </div>
  );
}

function MockupSlot({
  label,
  title,
  detail,
  icon,
}: {
  label: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
}) {
  // Stack every title onto two lines for visual consistency across slots.
  // Split at the first whitespace; if the title is a single word, the
  // second line is a non-breaking space so the row still reserves 2 lh.
  const spaceIdx = title.indexOf(" ");
  const titleTop = spaceIdx === -1 ? title : title.slice(0, spaceIdx);
  const titleBottom = spaceIdx === -1 ? " " : title.slice(spaceIdx + 1);

  return (
    <div className="flex-1 min-w-0 flex flex-col rounded-lg bg-(--brand-surface) border border-(--brand-border) px-3 py-3.5">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[9px] uppercase tracking-[0.14em] text-(--brand-muted) font-medium">
          {label}
        </span>
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[5px]"
          aria-hidden
        >
          {icon}
        </span>
      </div>
      <div className="flex flex-col gap-1 pt-3">
        <span className="text-[13px] font-semibold text-(--brand-fg) leading-tight break-words">
          <span className="block">{titleTop}</span>
          <span className="block">{titleBottom}</span>
        </span>
        <span className="text-[11px] text-(--brand-muted) leading-snug break-words">
          {detail}
        </span>
      </div>
    </div>
  );
}

/**
 * Source → destination connector. Delegates to the client-only
 * `AnimatedFlowArrow` so the animation runs in the browser; the page
 * itself stays a server component.
 */
function ArrowConnector() {
  return <AnimatedFlowArrow />;
}

const MOCKUP_LABELS: Record<
  "checkout" | "deposit" | "withdraw",
  {
    source: { title: string; detail: string; icon: React.ReactNode };
    destination: { title: string; detail: string; icon: React.ReactNode };
  }
> = {
  checkout: {
    source: {
      title: "Buyer wallet",
      detail: "Any wallet, chain",
      icon: <EthereumIcon className="h-5 w-5" />,
    },
    destination: {
      title: "Merchant vault",
      detail: "Any token, any chain",
      icon: <FireblocksIcon className="h-5 w-5" />,
    },
  },
  deposit: {
    source: {
      title: "Phantom wallet",
      detail: "SOL on Solana",
      icon: <PhantomIcon className="h-5 w-5" />,
    },
    destination: {
      title: "Embedded wallet or vault",
      detail: "USDC on Base",
      icon: <FireblocksIcon className="h-5 w-5" />,
    },
  },
  withdraw: {
    source: {
      title: "Embedded wallet",
      detail: "USDC on Base",
      icon: <DynamicWalletIcon />,
    },
    destination: {
      title: "User wallet",
      detail: "Any token",
      icon: <MetaMaskIcon className="h-5 w-5" />,
    },
  },
};
