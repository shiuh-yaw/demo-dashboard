/**
 * Contacts workspace loading fallback - a table skeleton, mirroring the
 * per-prospect Contacts tab's `loading.tsx`.
 */

import { TableCardSkeleton } from "@/components/shared/loading-skeletons";

export default function ContactsWorkspaceLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone who has viewed a demo across your prospects, grouped by
          viewer identity.
        </p>
      </div>
      <TableCardSkeleton rows={8} />
    </div>
  );
}
