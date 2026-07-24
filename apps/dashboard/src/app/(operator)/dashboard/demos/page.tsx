/**
 * Demos catalog. The internal reference of demo TYPES we offer (sourced from
 * the landing catalog), not per-prospect instances. Read-only: illustration,
 * name, tagline, launch URL, and public-listing status - "what demos exist to
 * build for a prospect". Each card drills into the internal
 * operator demo-detail route (not the public marketing page).
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/droplet-client";
import { OperatorDemoHero } from "@/components/demo-illustrations/demo-hero";
import { LANDING_DEMOS, demoDetailId } from "@/lib/landing/demos";
import { displayHost } from "@/lib/display-host";

export const dynamic = "force-dynamic";

export default function DemosCatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Demos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The catalog of demo types you can brand and build for a prospect.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LANDING_DEMOS.map((demo) => (
          <Link
            key={demo.slug}
            href={`/dashboard/demos/${demoDetailId(demo)}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-border-divider bg-card outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative">
              <OperatorDemoHero demo={demo} className="h-32" />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="text-sm font-semibold text-foreground">
                {demo.name}
              </h2>
              <p className="mt-1.5 flex-1 text-sm text-muted-foreground">
                {demo.tagline}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                <Badge variant={demo.showOnLanding ? "success" : "inactive"}>
                  {demo.showOnLanding ? "Listed publicly" : "Internal only"}
                </Badge>
                {demo.url ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    {displayHost(demo.url)}
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="text-muted-foreground">Coming soon</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
