/**
 * Contacts tab loading fallback - a table skeleton, not the Overview
 * chart layout (which the parent segment's loading.tsx would otherwise cascade).
 */

import { TableCardSkeleton } from "@/components/shared/loading-skeletons";

export default function ContactsLoading() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Contacts</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Who has been viewing this prospect&apos;s demos, enriched by company
          and captured identity.
        </p>
      </div>
      <TableCardSkeleton rows={5} />
    </section>
  );
}
