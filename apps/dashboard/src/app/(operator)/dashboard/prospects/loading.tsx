/**
 * Prospect hub loading fallback - covers the async hub layout (identity header
 * fetch) so navigating into a prospect shows a skeleton immediately instead of
 * blocking on the layout's reads.
 */

import { Skeleton } from "@/components/droplet-client";
import {
  ChartCardSkeleton,
  MetricCardsSkeleton,
} from "@/components/shared/loading-skeletons";

export default function ProspectHubLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <MetricCardsSkeleton />
      <ChartCardSkeleton />
    </div>
  );
}
