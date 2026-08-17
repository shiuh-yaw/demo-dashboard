"use client";

/**
 * Presentational half of the contact detail page: stat strip, company profile,
 * per-demo engagement, then the session list. Client only for the droplet
 * primitives - it fetches nothing and holds no state.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock3,
  ExternalLink,
  Layers,
  Monitor,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/droplet-client";
import { SECTION_CARD } from "@/components/shared/section-card";
import { THIN_SCROLLBAR } from "@/components/shared/thin-scrollbar";
import {
  companyProfileLine,
  formatDateTime,
  formatMilestoneName,
  formatDuration,
  formatShortDate,
  milestoneLabel,
} from "@/lib/format/contact-format";
import type { ContactCompany, ContactDetail } from "@/lib/services";
import { enrichContactAction } from "@/lib/actions/enrich-contact";
import { createProspectForContactAction } from "@/lib/actions/create-prospect-for-contact";
import { ENRICH_MESSAGES, ENRICH_NOT_SAVED } from "@/lib/format/enrich-copy";

export interface ProspectLink {
  id: string;
  name: string;
  /** False when the operator can see the contact but not open its prospect. */
  linkable: boolean;
}

/** Whole seconds/minutes, matching the session table's duration formatting. */
function formatSeconds(total: number): string {
  if (total < 60) return `${total}s`;
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return sec === 0 ? `${min}m` : `${min}m ${sec}s`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={SECTION_CARD}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

export function ContactDetailView({
  detail,
  prospects,
  canCreateProspect = false,
}: {
  detail: ContactDetail;
  prospects: ProspectLink[];
  /** Gates the create-prospect action; VIEWERs get the card read-only. */
  canCreateProspect?: boolean;
}) {
  const router = useRouter();
  const { contact, sessions, demos } = detail;
  const [resolved, setResolved] = useState<ContactCompany | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateProspect() {
    if (isCreating) return;
    setIsCreating(true);
    setNote(null);
    try {
      const outcome = await createProspectForContactAction(contact.id);
      if (outcome.status === "ok" || outcome.status === "exists") {
        // The link is derived server-side from the company domain, so the
        // refreshed page is what surfaces it.
        router.refresh();
      } else {
        setNote(
          outcome.status === "denied"
            ? "You cannot create prospects"
            : "Could not create a prospect",
        );
      }
    } catch {
      setNote("Could not create a prospect");
    } finally {
      setIsCreating(false);
    }
  }

  const company = contact.company ?? resolved;
  const profile = companyProfileLine(company);
  // Enrichment keys off the email's domain; a resolved company needs no lookup.
  const canEnrich = Boolean(!company && contact.email);

  async function handleEnrich() {
    if (isEnriching) return;
    setIsEnriching(true);
    setNote(null);
    try {
      const outcome = await enrichContactAction(contact.key);
      if (outcome.status === "ok") {
        setResolved(outcome.company);
        if (!outcome.persisted) setNote(ENRICH_NOT_SAVED);
        // Enriching also creates the prospect, so the section that lists it
        // needs re-rendering from the server.
        router.refresh();
      } else {
        setNote(ENRICH_MESSAGES[outcome.status]);
      }
    } catch {
      setNote("Enrich failed");
    } finally {
      setIsEnriching(false);
    }
  }
  const totalSeconds = demos.reduce((n, d) => n + d.totalDurationSec, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sessions" value={contact.sessionCount} />
        <Stat label="Demos viewed" value={demos.length} />
        <Stat label="Time on demos" value={formatSeconds(totalSeconds)} />
        <Stat label="First seen" value={formatShortDate(contact.firstSeenAt)} />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Company</h2>
        <div className={SECTION_CARD}>
          {/* One row: profile on the left, where it can act on the right.
              The prospect link used to sit in its own divided block below,
              which spent a full row on a single chip. */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              {company ? (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {company.name ?? company.domain}
                    </span>
                    {company.domain && (
                      <a
                        href={`https://${company.domain}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {company.domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {profile && (
                    <p className="text-xs text-muted-foreground">{profile}</p>
                  )}
                  {company.summary && (
                    <p className="text-sm text-muted-foreground">
                      {company.summary}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {note ??
                    (contact.email
                      ? "No company resolved yet."
                      : "Anonymous viewer - no email to resolve a company from.")}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {prospects.length > 0
                ? prospects.map((p) =>
                    p.linkable ? (
                      <Link
                        key={p.id}
                        href={`/dashboard/prospects/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        {p.name}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    ) : (
                      // Named but not openable - seeing a contact does not
                      // imply access to its prospect.
                      <span
                        key={p.id}
                        title="You do not have access to this prospect"
                        className="inline-flex items-center rounded-md border border-border px-2 py-1 text-sm text-muted-foreground"
                      >
                        {p.name}
                      </span>
                    ),
                  )
                : !company && (
                    <span
                      title="Arrived without a share link, so it belongs to no prospect"
                      className="text-xs text-muted-foreground"
                    >
                      Direct
                    </span>
                  )}

              {canCreateProspect && company && prospects.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCreateProspect()}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Spinner className="h-3 w-3" />
                      Creating...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      Create prospect
                    </span>
                  )}
                </Button>
              )}

              {canEnrich && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleEnrich()}
                  disabled={isEnriching}
                >
                  {isEnriching ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Spinner className="h-3 w-3" />
                      Enriching...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Enrich
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>

          {company && prospects.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Direct - arrived without a share link, so they belong to no
              prospect yet.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Demos they viewed
        </h2>
        <div
          className={`overflow-x-auto rounded-xl border border-border bg-card ${THIN_SCROLLBAR}`}
        >
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Demo</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Total time</TableHead>
                <TableHead className="text-right">Avg session</TableHead>
                <TableHead>Furthest step</TableHead>
                <TableHead className="text-right">Last viewed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demos.map((d) => (
                <TableRow key={d.demoSlug}>
                  <TableCell className="font-medium text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                      {d.demoSlug}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.sessions}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                    {formatSeconds(d.totalDurationSec)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                    {formatSeconds(d.avgDurationSec)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {formatMilestoneName(d.furthestMilestone)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                    {formatShortDate(d.lastViewedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Sessions</h2>
        <div
          className={`overflow-x-auto rounded-xl border border-border bg-card ${THIN_SCROLLBAR}`}
        >
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                <TableHead>Demo</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Milestone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
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
      </section>
    </div>
  );
}
