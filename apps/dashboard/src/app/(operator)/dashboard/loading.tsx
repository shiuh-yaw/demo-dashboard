/** Route-loading fallback for the GTM overview home - mirrors OverviewPage's metric row + prospects table. */

import {
  MetricCardsSkeleton,
  TableCardSkeleton,
} from "@/components/shared/loading-skeletons";

export default function OverviewLoading() {
  return (
    <div className="flex flex-col gap-8 sm:h-full">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your prospects and how they are engaging with the demos you have
          shared.
        </p>
      </div>
      <MetricCardsSkeleton />
      <TableCardSkeleton rows={6} />
    </div>
  );
}
