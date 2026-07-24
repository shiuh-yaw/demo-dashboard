/**
 * Route-loading fallback for the catalog demo-detail page - mirrors the
 * identity header card (title/meta/description + actions) and
 * `demo-kind-analytics.tsx`'s filter row, metric cards, momentum chart, and
 * funnel. Keep in lockstep with `page.tsx` so there's no layout shift and no
 * literal copy (e.g. "Analytics") rendered mid-skeleton.
 */

import { Skeleton } from "@/components/droplet-client";
import {
  ChartCardSkeleton,
  FunnelCardSkeleton,
  MetricCardsSkeleton,
} from "@/components/shared/loading-skeletons";

export default function DemoDetailLoading() {
  return (
    <div className="space-y-8">
      {/* Identity header - single card: title/meta + actions, then description. */}
      <div className="space-y-4 rounded-xl border border-border-divider bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-44 rounded-md" />
          </div>
        </div>

        {/* Description row, full width - two lines. */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-3/4 max-w-xl" />
        </div>
      </div>

      <section className="space-y-3 border-t border-border-divider pt-6">
        <div>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="mt-1.5 h-4 w-96 max-w-full" />
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-9 w-48 rounded-md" />
            <Skeleton className="h-9 w-full rounded-md sm:w-40" />
          </div>

          <MetricCardsSkeleton />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCardSkeleton heightClassName="h-[280px]" />
            <FunnelCardSkeleton />
          </div>
        </div>
      </section>
    </div>
  );
}
