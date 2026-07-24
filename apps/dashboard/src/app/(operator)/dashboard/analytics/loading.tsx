/** Route-loading fallback for org analytics - mirrors `analytics-dashboard.tsx`'s momentum + funnel + per-kind comparison layout. */

import { Skeleton } from "@/components/droplet-client";
import {
  ChartCardSkeleton,
  FunnelCardSkeleton,
} from "@/components/shared/loading-skeletons";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Org-wide sessions, engagement, and demo fit across every demo.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-64" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Skeleton className="h-9 w-full rounded-md sm:w-44" />
            <Skeleton className="h-9 w-full rounded-md sm:w-40" />
          </div>
        </div>

        <ChartCardSkeleton heightClassName="h-[280px]" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FunnelCardSkeleton />
          <FunnelCardSkeleton />
        </div>
      </div>
    </div>
  );
}
