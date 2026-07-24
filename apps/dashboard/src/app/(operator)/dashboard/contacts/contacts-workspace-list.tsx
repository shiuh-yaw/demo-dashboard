"use client";

/**
 * Client half of the org-wide Contacts workspace view: `useInfiniteList` +
 * a "Load more" control over the shared `ContactsTable` (row list +
 * inline-expand to sessions, same component the per-prospect Contacts tab
 * uses). SSR-seeded from the server component's first page via
 * `initialPage` - no fetch on mount.
 */

import { Button, Spinner } from "@/components/droplet-client";
import { ContactsTable } from "@/components/shared/contacts-table";
import { keys } from "@/lib/query/keys";
import { useInfiniteList } from "@/lib/query/use-infinite-list";
import type { Page } from "@/lib/services";
import { listAllContactsAction, listAllContactSessionsAction } from "./actions";
import type { ContactRow } from "./contact-row";

export interface ContactsWorkspaceListProps {
  initialPage: Page<ContactRow>;
  /** From `prospectScopeCacheKey` - varies the query key so switching the
   * active My/Team/All scope fetches fresh rows instead of reusing a
   * previously-cached page from a different scope. */
  scopeKey: string;
}

export function ContactsWorkspaceList({
  initialPage,
  scopeKey,
}: ContactsWorkspaceListProps) {
  const { items, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteList<ContactRow>({
      queryKey: keys.contacts.list({ scope: scopeKey }),
      fetchPage: (cursor) => listAllContactsAction(cursor),
      initialPage,
    });

  return (
    <section className="space-y-3">
      <ContactsTable
        contacts={items}
        emptyTitle="No Contacts Yet"
        emptyDescription="Share a demo link with a prospect. Viewers show up here across your whole workspace as they engage."
        fetchSessions={(contact) => listAllContactSessionsAction(contact.key)}
        extraColumn={{
          header: "Prospects",
          cell: (contact) => contact.prospectNames.join(", ") || "-",
        }}
      />

      {hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Loading...
              </span>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
