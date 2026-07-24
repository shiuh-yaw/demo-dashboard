/**
 * Route-loading fallback for the Checkout Overview tab - mirrors
 * `overview-tab.tsx`'s stat cards + transaction health/recent-activity
 * table. The tab shell (header/nav) lives in the persistent layout and
 * paints first; this only covers the page's own async fetch.
 */

import {
  MetricCardsSkeleton,
  TableCardSkeleton,
} from "@/components/shared/loading-skeletons";

export default function CheckoutOverviewLoading() {
  return (
    <div className="space-y-6">
      <MetricCardsSkeleton count={3} />
      <TableCardSkeleton rows={4} />
    </div>
  );
}
