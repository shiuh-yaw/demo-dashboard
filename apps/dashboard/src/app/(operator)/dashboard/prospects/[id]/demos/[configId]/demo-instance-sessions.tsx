"use client";

/**
 * "Who viewed this demo" - one row per unique viewer (email, else anon id),
 * newest activity first, reusing the inline-expandable-row pattern from
 * `../../prospect-contacts.tsx`. Clicking a viewer row reveals every one of
 * that viewer's sessions, each with its own milestone-progression chips plus
 * started/last-seen/duration. No flyout or Sheet. PII (company, email) is
 * intentionally viewable here - the operator owns this data. All sessions
 * are fetched upfront by the page and grouped client-side, so expanding a
 * row is a pure local toggle - no per-row fetch.
 */

import { Fragment, useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import {
  Badge,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/droplet-client";
import type { VisitorSessionView } from "@/lib/services";
import { THIN_SCROLLBAR } from "@/components/shared/thin-scrollbar";
import {
  formatDateTime,
  formatDuration,
  milestoneLabel,
} from "../../prospect-contacts-format";
import {
  formatMilestoneChip,
  groupSessionsByViewer,
  sessionCompanyLabel,
} from "./demo-instance-sessions-format";

export interface DemoInstanceSessionsProps {
  sessions: VisitorSessionView[];
}

export function DemoInstanceSessions({ sessions }: DemoInstanceSessionsProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const viewers = groupSessionsByViewer(sessions);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, key: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle(key);
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Who Viewed This Demo</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every viewer of this demo, newest activity first.
        </p>
      </div>

      {viewers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Viewers Yet"
          description="Share a demo link with this prospect. Viewers show up here as they engage."
        />
      ) : (
        <div
          className={`overflow-x-auto rounded-xl border border-border bg-card ${THIN_SCROLLBAR}`}
        >
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Viewer</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Milestone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewers.map((viewer) => {
                const isOpen = expanded.has(viewer.key);
                const regionId = `demo-instance-viewer-${viewer.key}`;
                const latest = viewer.sessions[0];
                const label = viewer.email ?? sessionCompanyLabel(latest);

                return (
                  <Fragment key={viewer.key}>
                    <TableRow
                      role="button"
                      tabIndex={0}
                      aria-expanded={isOpen}
                      aria-controls={regionId}
                      aria-label={`${isOpen ? "Hide" : "Show"} sessions for ${label}`}
                      onClick={() => toggle(viewer.key)}
                      onKeyDown={(event) => handleRowKeyDown(event, viewer.key)}
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
                              {sessionCompanyLabel(latest)}
                            </p>
                            {viewer.email && (
                              <p className="truncate text-xs text-muted-foreground">
                                {viewer.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                        {viewer.sessionCount}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(viewer.lastSeenAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                        {milestoneLabel(latest)}
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="bg-muted/30 p-0">
                          <div
                            id={regionId}
                            role="region"
                            aria-label={`Sessions for ${label}`}
                            className="space-y-2 px-3 py-3 pl-8 sm:pl-12"
                          >
                            {viewer.sessions.map((s) => (
                              <div
                                key={s.id}
                                className="rounded-lg border border-border-divider bg-background/40 p-2.5"
                              >
                                <div className="flex flex-wrap gap-1.5">
                                  {s.milestones.length === 0 ? (
                                    <Badge variant="secondary">Viewed</Badge>
                                  ) : (
                                    s.milestones.map((m, i) => (
                                      <Badge key={`${m}-${i}`} variant="secondary">
                                        {formatMilestoneChip(m)}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                                <dl className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                                  <div>
                                    <dt className="text-muted-foreground">Started</dt>
                                    <dd className="text-foreground">
                                      {formatDateTime(s.startedAt)}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-muted-foreground">Last Seen</dt>
                                    <dd className="text-foreground">
                                      {formatDateTime(s.lastSeenAt)}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-muted-foreground">Duration</dt>
                                    <dd className="text-foreground">
                                      {formatDuration(s.startedAt, s.lastSeenAt)}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            ))}
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
      )}
    </section>
  );
}
