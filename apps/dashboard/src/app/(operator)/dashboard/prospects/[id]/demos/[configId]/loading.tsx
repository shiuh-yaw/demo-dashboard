/**
 * Route-loading fallback for a demo instance. No nested layout owns this
 * segment, so this mirrors the full `DemoConfigEditor` "prospect-instance"
 * shell: the compact name/actions header, the Insights | Theme toggle, then
 * the metrics/momentum/funnel/sessions content (`demo-instance-analytics.tsx`
 * + `demo-instance-sessions.tsx`).
 */

import { Skeleton } from "@/components/droplet-client";
import {
  ChartCardSkeleton,
  FunnelCardSkeleton,
  MetricCardsSkeleton,
  TableCardSkeleton,
} from "@/components/shared/loading-skeletons";

export default function DemoInstanceLoading() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="mb-6 inline-flex items-center gap-1 rounded-lg bg-muted/60 p-1"
      >
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>

      <div className="space-y-8">
        <MetricCardsSkeleton />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ChartCardSkeleton />
          <FunnelCardSkeleton />
        </div>

        <TableCardSkeleton rows={4} />
      </div>
    </div>
  );
}
