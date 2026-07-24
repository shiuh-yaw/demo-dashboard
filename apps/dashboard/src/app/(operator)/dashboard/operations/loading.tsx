/**
 * Admin loading fallback - the teams/roles tables, not the dashboard Overview
 * layout the parent segment's loading.tsx would otherwise cascade.
 */

import { Skeleton } from "@/components/droplet-client";
import { TableCardSkeleton } from "@/components/shared/loading-skeletons";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <TableCardSkeleton rows={2} />
      <TableCardSkeleton rows={6} />
    </div>
  );
}
