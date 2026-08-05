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

// Flow wordmark lives in @dynamic-demos/ui - connections presents under the same
// brand, and one copy is the only way the two cannot drift.
export { FlowMark } from "@dynamic-demos/ui";
