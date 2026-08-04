/** Route-loading fallback for the Catalog report - mirrors `catalog-funnel.tsx`'s two metric cards + launch table. */

import { Skeleton } from "@/components/droplet-client";

export default function CatalogAnalyticsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-72" />
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
