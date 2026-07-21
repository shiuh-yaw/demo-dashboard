import Link from "next/link";

/**
 * Flow-specific chrome for the scenario pages: the "what's next"
 * sibling-scenario switcher, the coming-soon placeholder, chain-name
 * helpers, and the Flow wordmark (rendered by the root layout's
 * SiteHeader `logo` slot).
 *
 * The generic scenario primitives (ScenarioEyebrow, RouteChip,
 * ChipArrow, ScenarioHero) live in @dynamic-demos/ui - they were
 * generalized FROM this file; import them from there.
 */

// =============================================================================
// Footer — "what's next" sibling-scenario cards + powered-by mark.
// =============================================================================

interface FooterScenario {
  id: "checkout" | "deposit" | "withdraw" | "kyc-deposit";
  num: string;
  title: string;
  description: string;
  href: string;
}

const FOOTER_SCENARIOS: FooterScenario[] = [
  {
    id: "checkout",
    num: "01",
    title: "Checkout",
    description:
      "Buyers pay with any token; the merchant vault receives the configured stablecoin every time.",
    href: "/checkout",
  },
  {
    id: "deposit",
    num: "02",
    title: "Deposit",
    description:
      "Users fund a platform balance from any wallet or centralized exchange.",
    href: "/deposit",
  },
  {
    id: "withdraw",
    num: "03",
    title: "Withdraw",
    description:
      "Cash out from a vault, embedded wallet, or external source to any user-chosen wallet.",
    href: "/withdraw",
  },
  {
    id: "kyc-deposit",
    num: "04",
    title: "KYC Deposit",
    description:
      "Verify identity, then deposit USDC to a dedicated address. Merchant off-ramps to fiat.",
    href: "/kyc-deposit",
  },
];

export function ScenarioSwitcher({
  active,
  exclude = [],
}: {
  active: "checkout" | "deposit" | "withdraw" | "kyc-deposit";
  /** Additional scenario ids to hide (e.g. KYC Deposit hides plain Deposit). */
  exclude?: Array<"checkout" | "deposit" | "withdraw" | "kyc-deposit">;
}) {
  const hidden = new Set([active, ...exclude]);
  const others = FOOTER_SCENARIOS.filter((s) => !hidden.has(s.id));

  return (
    <section className="mt-20 lg:mt-24">
      <div className="flex items-baseline gap-4 mb-8">
        <span className="text-[10px] uppercase tracking-[0.18em] text-(--brand-muted) font-medium">
          What&apos;s next
        </span>
        <span aria-hidden className="h-px flex-1 bg-(--brand-border)" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {others.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className="group flex flex-col gap-3 rounded-2xl bg-(--brand-surface) border border-(--brand-border) shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 hover:border-(--brand-primary) hover:shadow-[0_4px_16px_rgba(71,121,255,0.08)] transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-(--brand-muted)">
                {s.num}
              </span>
              <span className="text-(--brand-muted) group-hover:text-(--brand-primary) group-hover:translate-x-0.5 transition-all">
                <ArrowRight />
              </span>
            </div>
            <h3 className="text-lg font-semibold text-(--brand-fg) tracking-[-0.01em]">
              {s.title}
            </h3>
            <p className="text-sm text-(--brand-fg-secondary) leading-relaxed">
              {s.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M3 8h10m0 0L9 4m4 4L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =============================================================================
// Coming-soon placeholder — body slot for scenarios whose demo + code
// panels aren't wired up yet.
// =============================================================================

export function ComingSoon({ label }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-(--brand-border) bg-(--brand-surface) py-16 px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center h-5 px-2 rounded-full bg-(--brand-row-bg) text-(--brand-muted) border border-(--brand-border) text-[10px] font-medium uppercase tracking-[0.14em]">
        Coming soon
      </span>
      <p className="text-sm text-(--brand-fg-secondary) max-w-[28ch]">
        {label ?? "The live demo and code walkthrough land here next."}
      </p>
    </div>
  );
}

// =============================================================================
// Chain helpers — shared between hero copy + code generators.
// =============================================================================

export function prettyChain(chain: string): string {
  switch (chain) {
    case "base":
      return "Base";
    case "ethereum":
      return "Ethereum";
    case "polygon":
      return "Polygon";
    case "arbitrum":
      return "Arbitrum";
    case "optimism":
      return "Optimism";
    case "solana":
      return "Solana";
    default:
      return chain;
  }
}

// =============================================================================
// Flow wordmark — inline SVG so the home link works without an image fetch.
// =============================================================================

export function FlowMark() {
  return (
    <svg
      width="120"
      height="34"
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
