/**
 * Route-loading fallback for the prospect Demos segment. The hub header
 * comes from the persistent layout and paints first; this covers the
 * segment's own content - the demo comparison table - mirroring
 * `../prospect-demos.tsx`.
 */

import { TableCardSkeleton } from "@/components/shared/loading-skeletons";

export default function ProspectDemosLoading() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Demos</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every demo built for this prospect. Share a link or preview the
          branded theme.
        </p>
      </div>
      <TableCardSkeleton rows={4} />
    </section>
  );
}
