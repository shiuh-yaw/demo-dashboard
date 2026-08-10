/**
 * Public landing binding for the shared hero band. The band itself lives in
 * `@dynamic-demos/ui/demo-hero-band` (also used by the operator dashboard and
 * the OG unfurl); this only supplies the public palette and the illustration.
 */

import { CATEGORY_ACCENTS } from "@dynamic-demos/ui/demo-catalog";
import { DemoHeroBand } from "@dynamic-demos/ui/demo-hero-band";

import type { LandingDemo } from "@/lib/landing/demos";
import { getDemoIllustration } from "./illustrations";

export function DemoHero({
  demo,
  className = "h-44",
  illustrationClassName,
}: {
  demo: LandingDemo;
  className?: string;
  illustrationClassName?: string;
}) {
  const Illustration = getDemoIllustration(demo.slug);
  const accent = CATEGORY_ACCENTS[demo.category];

  return (
    <DemoHeroBand
      className={className}
      from={`color-mix(in srgb, ${accent} 14%, #ffffff)`}
      to="#ffffff"
      dotColor="color-mix(in srgb, #0f172a 6%, transparent)"
    >
      <div className={illustrationClassName}>
        <Illustration />
      </div>
    </DemoHeroBand>
  );
}
