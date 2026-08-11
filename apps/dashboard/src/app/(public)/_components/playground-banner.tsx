import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/droplet-client";
import type { LandingDemo } from "@/lib/landing/demos";
import { clearThemeUrl } from "@/lib/share-links/launch-url";
import { TrackedLaunchLink } from "./tracked-launch-link";

/**
 * Slim strip for the Playground - a general "try it live" sandbox rather than
 * one of the product demos, so it rides its own compact row above the grid
 * instead of borrowing a product card (and its product illustration). No detail
 * page: it launches straight out.
 */
export function PlaygroundBanner({ demo }: { demo: LandingDemo }) {
  if (demo.url === undefined) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 pt-2">
      <div className="relative overflow-hidden rounded-xl border border-[#E4E9F4] bg-[#F6F8FD] px-5 py-3.5">
        {/* Dot texture, matching the demo cards (same color/size/opacity as
            the shared DemoHeroBand). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in srgb, #0f172a 6%, transparent) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
              {demo.name}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{demo.tagline}</p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0 self-start sm:self-auto"
          >
            <TrackedLaunchLink
              demoSlug={demo.slug}
              href={clearThemeUrl(demo.url)}
              className="group/cta"
            >
              Launch
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5" />
            </TrackedLaunchLink>
          </Button>
        </div>
      </div>
    </section>
  );
}
