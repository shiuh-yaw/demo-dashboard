import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/droplet-client";
import type { LandingDemo } from "@/lib/landing/demos";
import { clearThemeUrl } from "@/lib/share-links/launch-url";
import { TrackedLaunchLink } from "./tracked-launch-link";
import { DemoHero } from "./demo-hero";

/** Per-category hero tint. */
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

        {/* Exactly two lines, whatever the tagline's length: `min-h` reserves the
            second line so a one-line tagline doesn't pull its card's buttons up
            out of line with its neighbours, and `line-clamp-2` stops a long one
            pushing them down. 2 x leading-relaxed (1.625) at text-sm. */}
        <p className="line-clamp-2 min-h-[2lh] flex-1 text-sm leading-relaxed text-slate-600">
          {demo.tagline}
        </p>

        <div className="mt-1 flex items-center gap-2">
          {demo.url !== undefined ? (
            <Button asChild className="flex-1">
              <TrackedLaunchLink
                demoSlug={demo.slug}
                href={clearThemeUrl(demo.url)}
                className="group/cta"
              >
                Launch demo
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5" />
              </TrackedLaunchLink>
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
