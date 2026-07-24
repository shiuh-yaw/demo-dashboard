/**
 * Route-loading fallback for the prospect Overview segment. The hub header
 * (name/domain/status) comes from the persistent layout and paints first;
 * this only covers the segment's own content - metric cards, momentum chart,
 * funnel, and recent activity - mirroring `prospect-overview.tsx`.
 */

import {
  ChartCardSkeleton,
  FunnelCardSkeleton,
  MetricCardsSkeleton,
  TableCardSkeleton,
} from "@/components/shared/loading-skeletons";

export default function ProspectOverviewLoading() {
  return (
    <div className="space-y-8">
      <MetricCardsSkeleton />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Momentum</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sessions over time across this prospect&apos;s demos.
          </p>
        </div>
        <ChartCardSkeleton />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Engagement Funnel
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              How far viewers get, all time.
            </p>
          </div>
          <FunnelCardSkeleton />
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Recent Activity
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              The latest views across this prospect&apos;s demos.
            </p>
          </div>
          <TableCardSkeleton rows={4} />
        </section>
      </div>
    </div>
  );
}
