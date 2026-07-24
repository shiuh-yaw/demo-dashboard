/**
 * Operator-owned mirror of the public `DemoHero`: category-tinted gradient
 * band + radial dot pattern + centered demo illustration. The band base and
 * dot color come from operator-scoped CSS vars so the band goes dark under the
 * operator dark surface; the public component is never imported or modified.
 */

import type { LandingDemo } from "@/lib/landing/demos";
import { getOperatorDemoIllustration } from "./illustrations";

const CATEGORY_ACCENTS: Record<LandingDemo["category"], string> = {
  wallet: "#4779FF",
  checkout: "#8b5cf6",
  offramp: "#10b981",
};

export function OperatorDemoHero({
  demo,
  className = "h-44",
  illustrationClassName,
}: {
  demo: LandingDemo;
  className?: string;
  illustrationClassName?: string;
}) {
  const Illustration = getOperatorDemoIllustration(demo.slug);
  const accent = CATEGORY_ACCENTS[demo.category];

  return (
    <div
      className={`relative ${className}`}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 14%, var(--di-hero-base)) 0%, var(--di-hero-base) 100%)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--di-hero-dot) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={illustrationClassName}>
          <Illustration />
        </div>
      </div>
    </div>
  );
}
