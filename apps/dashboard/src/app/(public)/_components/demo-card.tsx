import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/droplet-client";
import type { LandingDemo } from "@/lib/landing/demos";
import { clearThemeUrl } from "@/lib/share-links/launch-url";
import { getDemoIllustration } from "./illustrations";

/** Per-category hero tint. */
const CATEGORY_ACCENTS: Record<LandingDemo["category"], string> = {
  wallet: "#4779FF",
  checkout: "#8b5cf6",
  offramp: "#10b981",
};

/**
 * Gradient hero band in flow's ScenarioCard idiom — category-tinted
 * gradient, subtle radial dot pattern, centered demo illustration.
 * Shared by the demo card (h-44) and the detail page (taller).
 */
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
    <div
      className={`relative ${className}`}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 14%, #ffffff) 0%, #ffffff 100%)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, #0f172a 6%, transparent) 1px, transparent 1px)",
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

export function DemoCard({ demo }: { demo: LandingDemo }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#E1E4EA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <DemoHero demo={demo} />

      <div className="flex flex-1 flex-col gap-3 px-5 py-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-[-0.01em] text-slate-900">
            {demo.name}
          </h3>
          {demo.url === undefined && (
            <span className="text-xs font-medium text-slate-400">
              Coming soon
            </span>
          )}
        </div>

        <p className="flex-1 text-sm leading-relaxed text-slate-600">
          {demo.tagline}
        </p>

        <div className="mt-1 flex items-center gap-2">
          {demo.url !== undefined ? (
            <Button asChild className="flex-1">
              <a
                href={clearThemeUrl(demo.url)}
                target="_blank"
                rel="noreferrer"
                className="group/cta"
              >
                Launch demo
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5" />
              </a>
            </Button>
          ) : (
            <Button disabled className="flex-1">
              Launch demo
            </Button>
          )}
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/demos/${demo.slug}`}>Details</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
