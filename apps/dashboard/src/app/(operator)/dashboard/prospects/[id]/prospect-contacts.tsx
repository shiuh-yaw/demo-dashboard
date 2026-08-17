"use client";

/**
 * Contacts (enriched viewers) for a prospect: who has viewed the demos, by
 * company (email-domain enrichment) and captured identity (email), with
 * first/last seen, which demos, and session count. Read-only projection from
 * the analytics read layer - no raw IPs, PII bounded per Phase 10.
 *
 * Thin wrapper around the shared `ContactsTable` (row list + inline-expand to
 * sessions) - see `@/components/shared/contacts-table` for the interaction;
 * this file only supplies the prospect-scoped data and the session fetch.
 */

import { ContactsTable } from "@/components/shared/contacts-table";
import type { ContactView } from "@/lib/services";
import { enrichContactAction } from "@/lib/actions/enrich-contact";

export interface ProspectContactsProps {
  prospectId: string;
  contacts: ContactView[];
}

/** The "who has been viewing" table on the prospect hub. */
export function ProspectContacts({ prospectId, contacts }: ProspectContactsProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Contacts</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Who has been viewing this prospect&apos;s demos, enriched by company
          and captured identity.
        </p>
      </div>

      <ContactsTable
        contacts={contacts}
        emptyTitle="No Viewers Yet"
        emptyDescription="Share a demo link with this prospect. Viewers show up here as they engage."
        onEnrich={(contact) => enrichContactAction(contact.key)}
      />
    </section>
  );
}
