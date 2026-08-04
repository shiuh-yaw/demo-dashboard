/**
 * Catalog demo trend - the drill-down behind a Catalog report row: daily
 * launches over time for a single demo. Anonymous catalog traffic only (no
 * contacts to surface - see the Engagement tab for prospect identity); reads
 * `catalogDemoTimeseries`, isolated from the share-link join like the rest of
 * the Catalog report.
 */

import Link from "next/link";
import { ChevronLeft, BarChart3 } from "lucide-react";

import { requireUser } from "@/lib/auth/gtm";
import { services } from "@/lib/services";
import { MetricCard } from "@/components/droplet-client";
import { getDemoBySlug } from "@/lib/landing/demos";
import { CatalogTrendChart } from "./catalog-trend-chart";

export const dynamic = "force-dynamic";

/** Fixed window for the v1 trend - catalog tracking is recent, so 30 days
 *  comfortably covers it; a range selector can come later if needed. */
const TREND_RANGE = "30d" as const;
const TREND_DAYS = 30;

export default async function CatalogDemoTrendPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;

  const points = await services.analytics.catalogDemoTimeseries(slug, TREND_RANGE);
  const name = getDemoBySlug(slug)?.name ?? slug;
  const totalLaunches = points.reduce((sum, p) => sum + p.launches, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/analytics/catalog"
            aria-label="Back to Catalog"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h2 className="text-lg font-semibold text-foreground">{name}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Launches from the demo catalog over the last {TREND_DAYS} days.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:max-w-xs">
        <MetricCard label={`Launches (${TREND_DAYS} days)`} value={totalLaunches} />
      </div>

      <div className="rounded-xl border border-border-divider bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          Launches Over Time
        </h3>
        <CatalogTrendChart points={points} />
      </div>
    </div>
  );
}
