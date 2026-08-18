"use client";

/**
 * Shared contacts row table: the presentational piece behind both the
 * per-prospect Contacts tab (`prospects/[id]/prospect-contacts.tsx`) and the
 * org-wide Contacts workspace view (`dashboard/contacts/`). Each caller owns
 * its own data fetching (a per-prospect `ContactView[]` vs. a cross-prospect
 * `OrgContactView[]`); this owns only the row list.
 *
 * Rows navigate to the contact's detail page rather than expanding in place -
 * sessions, per-demo stats and the company profile all live there, where there
 * is room for them.
 *
 * Client component: it owns its lucide icons (`EmptyState icon={Users}`). A
 * server parent must never pass an icon component across the RSC boundary.
 */

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
  MoreHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/droplet-client";
import type { ContactCompany, ContactView } from "@/lib/services";
import type { EnrichContactOutcome } from "@/lib/actions/enrich-contact";
import { THIN_SCROLLBAR } from "@/components/shared/thin-scrollbar";
import { formatShortDate } from "@/lib/format/contact-format";
import { ENRICH_MESSAGES, ENRICH_NOT_SAVED } from "@/lib/format/enrich-copy";

/** Company name with the building glyph. */
function CompanyName({ company }: { company: ContactCompany }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-foreground">
      <Building2
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
      />
      {company.name ?? company.domain}
    </span>
  );
}

/** Company cell - presentational only. Runs start from the row-actions menu
 * and their state lives on the table, so this just renders the outcome. */
function CompanyCell({
  company,
  note,
  isEnriching,
}: {
  company: ContactCompany | null;
  note: string | undefined;
  isEnriching: boolean;
}) {
  if (isEnriching) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Spinner className="h-3 w-3" />
        Enriching...
      </span>
    );
  }
  if (company) {
    return (
      <span className="inline-flex items-center gap-2">
        <CompanyName company={company} />
        {/* Only set when the value was resolved but not stored. */}
        {note && (
          <span className="text-xs text-amber-600 dark:text-amber-500">
            {note}
          </span>
        )}
      </span>
    );
  }
  if (note) return <span className="text-xs text-muted-foreground">{note}</span>;
  return <span className="text-muted-foreground">-</span>;
}

/** Trailing row-actions menu. Rendered only when an action is available. */
function ContactRowActions({
  isEnriching,
  onEnrich,
}: {
  isEnriching: boolean;
  onEnrich: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Contact actions"
          // The row navigates - opening the menu must not.
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem disabled={isEnriching} onSelect={() => onEnrich()}>
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          Enrich company
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** An optional extra column rendered before "Demos" (e.g. "Prospects" org-wide). */
export interface ContactsTableExtraColumn<C> {
  header: string;
  cell: (contact: C) => ReactNode;
}

export interface ContactsTableProps<C extends ContactView> {
  contacts: C[];
  emptyTitle: string;
  emptyDescription: string;
  extraColumn?: ContactsTableExtraColumn<C>;
  /** Enables the on-demand "Enrich" control on contacts that have a captured
   * email but no company yet. Omitted -> no control (the cell just reads "-"). */
  onEnrich?: (contact: C) => Promise<EnrichContactOutcome>;
}

/** The "who has been viewing" table, shared by the per-prospect and org-wide Contacts views. */
export function ContactsTable<C extends ContactView>({
  contacts,
  emptyTitle,
  emptyDescription,
  extraColumn,
  onEnrich,
}: ContactsTableProps<C>) {
  const router = useRouter();
  // Enrich state is keyed by contact so the row-actions menu can start a run
  // while the Company cell renders its result.
  const [enrichedByKey, setEnrichedByKey] = useState<Record<string, ContactCompany>>({});
  const [enrichNoteByKey, setEnrichNoteByKey] = useState<Record<string, string>>({});
  const [enrichingKeys, setEnrichingKeys] = useState<Set<string>>(new Set());

  function openContact(contact: C) {
    // The key is an email or an anonId - both need encoding as a path segment.
    router.push(`/dashboard/contacts/${encodeURIComponent(contact.key)}`);
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement>,
    contact: C,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openContact(contact);
  }

  async function handleEnrich(contact: C) {
    if (!onEnrich) return;
    const key = contact.key;
    setEnrichingKeys((prev) => new Set(prev).add(key));
    // Clear any prior note so a retry doesn't show the last failure's copy.
    setEnrichNoteByKey((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)),
    );
    try {
      const outcome = await onEnrich(contact);
      if (outcome.status === "ok") {
        setEnrichedByKey((prev) => ({ ...prev, [key]: outcome.company }));
        // A resolved-but-unsaved company disappears on reload. Say so here
        // instead of rendering it as an ordinary success.
        if (!outcome.persisted) {
          setEnrichNoteByKey((prev) => ({ ...prev, [key]: ENRICH_NOT_SAVED }));
        }
      } else {
        setEnrichNoteByKey((prev) => ({
          ...prev,
          [key]: ENRICH_MESSAGES[outcome.status],
        }));
      }
    } catch {
      setEnrichNoteByKey((prev) => ({ ...prev, [key]: "Enrich failed" }));
    } finally {
      setEnrichingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  if (contacts.length === 0) {
    return <EmptyState icon={Users} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div
      className={`overflow-x-auto rounded-xl border border-border bg-card ${THIN_SCROLLBAR}`}
    >
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Contact</TableHead>
            <TableHead>Company</TableHead>
            {extraColumn && <TableHead>{extraColumn.header}</TableHead>}
            <TableHead className="text-right">Demos</TableHead>
            <TableHead className="text-right">Sessions</TableHead>
            <TableHead className="text-right">First Seen</TableHead>
            <TableHead className="text-right">Last Seen</TableHead>
            <TableHead className="w-20">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((c) => {
            const label = c.email ?? "Unknown User";
            // Resolved once: the stored company, or one enriched in this
            // session. The cell and the actions menu must agree.
            const company = c.company ?? enrichedByKey[c.key] ?? null;
            // Enrichment keys off the email's domain, and a resolved company
            // needs no lookup - either way there is nothing to offer.
            const canEnrich = Boolean(onEnrich && c.email && !company);

            return (
              <TableRow
                key={c.key}
                role="link"
                tabIndex={0}
                aria-label={`Open ${label}`}
                onClick={() => openContact(c)}
                onKeyDown={(event) => handleRowKeyDown(event, c)}
                className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <TableCell>
                  <p className="min-w-0 truncate font-medium text-foreground">
                    {label}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <CompanyCell
                    company={company}
                    note={enrichNoteByKey[c.key]}
                    isEnriching={enrichingKeys.has(c.key)}
                  />
                </TableCell>
                {extraColumn && (
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {extraColumn.cell(c)}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {c.demoSlugs.length}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {c.sessionCount}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                  {formatShortDate(c.firstSeenAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                  {formatShortDate(c.lastSeenAt)}
                </TableCell>
                <TableCell className="w-20">
                  <div className="flex items-center justify-end gap-0.5">
                    {/* Only when something can actually be done - a menu whose
                        single item is disabled is noise on every row. */}
                    {canEnrich && (
                      <ContactRowActions
                        isEnriching={enrichingKeys.has(c.key)}
                        onEnrich={() => void handleEnrich(c)}
                      />
                    )}
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
