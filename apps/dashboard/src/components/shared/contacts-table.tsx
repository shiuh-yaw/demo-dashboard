"use client";

/**
 * Shared contacts row/expand table: the presentational piece behind both the
 * per-prospect Contacts tab (`prospects/[id]/prospect-contacts.tsx`) and the
 * org-wide Contacts workspace view (`dashboard/contacts/`). Grouping/data
 * fetching stays with each caller (a per-prospect `ContactView[]` vs. a
 * cross-prospect `OrgContactView[]`, and a differently-scoped session
 * fetch) - this component owns only the row list, the expand/collapse
 * state, and the inline sessions sub-table, so neither caller re-implements
 * that interaction.
 *
 * Client component: it owns its lucide icons (`EmptyState icon={Users}`). A
 * server parent must never pass an icon component across the RSC boundary.
 */

import { Fragment, useState, type ReactNode } from "react";
import { ChevronRight, Clock3, Layers, Users } from "lucide-react";
import {
  EmptyState,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/droplet-client";
import type { ContactView, VisitorSessionView } from "@/lib/services";
import { THIN_SCROLLBAR } from "@/components/shared/thin-scrollbar";
import {
  formatDateTime,
  formatDuration,
  formatShortDate,
  milestoneLabel,
} from "@/lib/format/contact-format";

/** An optional extra column rendered after "Demos" (e.g. "Prospects" org-wide). */
export interface ContactsTableExtraColumn<C> {
  header: string;
  cell: (contact: C) => ReactNode;
}

export interface ContactsTableProps<C extends ContactView> {
  contacts: C[];
  emptyTitle: string;
  emptyDescription: string;
  /** Fetch (and cache) sessions for one contact on expand - scoped however
   * the caller needs (single prospect vs. every prospect in the active
   * scope); this component never assumes a prospect id. */
  fetchSessions: (contact: C) => Promise<VisitorSessionView[]>;
  extraColumn?: ContactsTableExtraColumn<C>;
}

/** The "who has been viewing" table, shared by the per-prospect and org-wide Contacts views. */
export function ContactsTable<C extends ContactView>({
  contacts,
  emptyTitle,
  emptyDescription,
  fetchSessions,
  extraColumn,
}: ContactsTableProps<C>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sessionsByKey, setSessionsByKey] = useState<Record<string, VisitorSessionView[]>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  async function toggleContact(contact: C) {
    const key = contact.key;
    const willExpand = !expanded.has(key);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (willExpand) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
    if (!willExpand || key in sessionsByKey) return;

    setLoadingKeys((prev) => new Set(prev).add(key));
    try {
      const rows = await fetchSessions(contact);
      setSessionsByKey((prev) => ({ ...prev, [key]: rows }));
    } finally {
      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement>,
    contact: C,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    void toggleContact(contact);
  }

  if (contacts.length === 0) {
    return <EmptyState icon={Users} title={emptyTitle} description={emptyDescription} />;
  }

  const columnCount = extraColumn ? 6 : 5;

  return (
    <div
      className={`overflow-x-auto rounded-xl border border-border bg-card ${THIN_SCROLLBAR}`}
    >
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead>Contact</TableHead>
            <TableHead>Demos</TableHead>
            {extraColumn && <TableHead>{extraColumn.header}</TableHead>}
            <TableHead className="text-right">Sessions</TableHead>
            <TableHead className="text-right">First Seen</TableHead>
            <TableHead className="text-right">Last Seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((c) => {
            const isOpen = expanded.has(c.key);
            const rowSessions = sessionsByKey[c.key];
            const isLoading = loadingKeys.has(c.key);
            const regionId = `contact-sessions-${c.key}`;
            const label = c.email ?? "Unknown User";

            return (
              <Fragment key={c.key}>
                <TableRow
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-controls={regionId}
                  aria-label={`${isOpen ? "Hide" : "Show"} sessions for ${label}`}
                  onClick={() => void toggleContact(c)}
                  onKeyDown={(event) => handleRowKeyDown(event, c)}
                  className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <ChevronRight
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {c.email ?? "Unknown User"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {c.demoSlugs.join(", ") || "-"}
                  </TableCell>
                  {extraColumn && (
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {extraColumn.cell(c)}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {c.sessionCount}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                    {formatShortDate(c.firstSeenAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                    {formatShortDate(c.lastSeenAt)}
                  </TableCell>
                </TableRow>

                {isOpen && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columnCount} className="bg-muted/30 p-0">
                      <div
                        id={regionId}
                        role="region"
                        aria-label={`Sessions for ${label}`}
                        className="px-3 py-3 pl-8 sm:pl-12"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Spinner className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ) : !rowSessions || rowSessions.length === 0 ? (
                          <p className="py-3 text-center text-sm text-muted-foreground">
                            No sessions found for this contact.
                          </p>
                        ) : (
                          <div
                            className={`overflow-x-auto rounded-lg border border-border-divider bg-background/40 ${THIN_SCROLLBAR}`}
                          >
                            <Table className="min-w-[480px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Demo</TableHead>
                                  <TableHead>Started</TableHead>
                                  <TableHead>Duration</TableHead>
                                  <TableHead className="text-right">
                                    Milestone
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rowSessions.map((s) => (
                                  <TableRow key={s.id} className="hover:bg-transparent">
                                    <TableCell className="font-medium text-foreground">
                                      {s.demoSlug}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-muted-foreground">
                                      {formatDateTime(s.startedAt)}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-muted-foreground">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        {formatDuration(s.startedAt, s.lastSeenAt)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                                      <span className="inline-flex items-center justify-end gap-1">
                                        <Layers className="h-3.5 w-3.5" />
                                        {milestoneLabel(s)}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
