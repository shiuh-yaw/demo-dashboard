/**
 * Row view for the Overview home prospect list: a `ProspectProfile` merged
 * with its engagement summary. Shared by the server component (first page),
 * the paged action (`listOverviewRowsPage`), and the client list so the shape
 * is defined once. Pure - no server-only imports - so it is safe to import
 * from both a "use server" action and a "use client" component.
 */

import type { ProspectProfile } from "@/lib/types/dashboard";
import type { ProspectSummary } from "@/lib/services/types";

export interface OverviewProspectRow {
  id: string;
  name: string;
  domain: string | null;
  demos: number;
  sessions: number;
  viewers: number;
  lastViewedAt: string | null;
  updatedAt: string;
}

/** Maps a profile + the batch summary map to a row; zero-fills missing ids. */
export function toOverviewRow(
  profile: ProspectProfile,
  summaries: Map<string, ProspectSummary>,
): OverviewProspectRow {
  const summary = summaries.get(profile.id);
  return {
    id: profile.id,
    name: profile.name,
    domain: profile.companyUrl ?? null,
    demos: Object.values(profile.demos).filter(Boolean).length,
    sessions: summary?.sessions ?? 0,
    viewers: summary?.viewers ?? 0,
    lastViewedAt: summary?.lastViewedAt ?? null,
    updatedAt: profile.updatedAt,
  };
}
