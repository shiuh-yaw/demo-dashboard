"use client";

/**
 * Client half of the org-wide Contacts workspace view: `useInfiniteList` +
 * a "Load more" control over the shared `ContactsTable` (row list +
 * inline-expand to sessions, same component the per-prospect Contacts tab
 * uses). SSR-seeded from the server component's first page via
 * `initialPage` - no fetch on mount.
 */

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Spinner } from "@/components/droplet-client";
import { ContactsTable } from "@/components/shared/contacts-table";
import { enrichContactAction } from "@/lib/actions/enrich-contact";
import { keys } from "@/lib/query/keys";
import { useInfiniteList } from "@/lib/query/use-infinite-list";
import type { Page } from "@/lib/services";
import { listAllContactsAction } from "./actions";
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
  // Off by default: anonymous viewers are the bulk of direct traffic and
  // nothing can be done with them, so the list leads with real people.
  const [showAnonymous, setShowAnonymous] = useState(false);

  const { items, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteList<ContactRow>({
      // The flag is part of the key: the two views are different result sets,
      // and a cursor from one is meaningless in the other.
      queryKey: keys.contacts.list({
        scope: scopeKey,
        anonymous: showAnonymous,
      }),
      fetchPage: (cursor) => listAllContactsAction(cursor, showAnonymous),
      // Only the default view is SSR-seeded; the other fetches on first toggle.
      initialPage: showAnonymous ? undefined : initialPage,
    });

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={showAnonymous}
          onClick={() => setShowAnonymous((prev) => !prev)}
        >
          {showAnonymous ? (
            <span className="inline-flex items-center gap-1.5">
              <EyeOff className="h-3.5 w-3.5" />
              Hide unidentified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Show unidentified
            </span>
          )}
        </Button>
      </div>

      {isLoading ? (
        // Toggling to the un-seeded view fetches; without this the empty state
        // flashes as though there were no contacts at all.
        <div className="flex justify-center rounded-xl border border-border bg-card py-12">
          <Spinner className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : (
      <ContactsTable
        contacts={items}
        emptyTitle={showAnonymous ? "No Contacts Yet" : "No Identified Contacts Yet"}
        emptyDescription={
          showAnonymous
            ? "Share a demo link with a prospect. Viewers show up here across your whole workspace as they engage."
            : "Nobody has signed in to a demo yet. Anonymous viewers are hidden - use Show unidentified to see them."
        }
        onEnrich={(contact) => enrichContactAction(contact.key)}
        extraColumn={{
          header: "Prospects",
          // No prospect means the viewer opened a demo directly rather than
          // through a share link - a real lead, not missing data.
          cell: (contact) =>
            contact.prospectNames.length > 0 ? (
              contact.prospectNames.join(", ")
            ) : (
              <span className="text-muted-foreground">Direct</span>
            ),
        }}
      />
      )}

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
