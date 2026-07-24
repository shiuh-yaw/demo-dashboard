/**
 * Prospect hub - Overview (default segment). A dashboard for the prospect
 * built from the read layer: prospect-level engagement totals, a momentum
 * series, an engagement funnel, and a recent-activity feed. Loads everything
 * the overview needs; the header + sub-nav come from the shared hub layout.
 */

import { notFound } from "next/navigation";
import { getProspectProfile } from "@/lib/actions/prospects";
import { getSessionUser, visibleProspectIds } from "@/lib/auth/gtm";
import { services } from "@/lib/services";
import {
  DEFAULT_PROSPECT_RANGE,
  ProspectOverview,
  type ActivityItem,
} from "./prospect-overview";

interface ProspectOverviewPageProps {
  params: Promise<{ id: string }>;
}

// Session demo-kind slugs -> Title Case labels for the activity feed.
const DEMO_SLUG_LABEL: Record<string, string> = {
  earn: "Earn",
  checkout: "Checkouts",
  wallet: "Wallet",
  remittance: "Remittance",
};

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function ProspectOverviewPage({
  params,
}: ProspectOverviewPageProps) {
  const { id } = await params;
  const result = await getProspectProfile(id);

  if (!result.success || !result.data) {
    notFound();
  }

  // Read scope is the caller's prospect visibility, re-derived server-side; the
  // funnel/timeseries reads fail closed when the prospect is out of view.
  const user = await getSessionUser();
  const scope = user ? await visibleProspectIds(user) : new Set<string>();

  const [summary, momentum, funnelStages, sessionRecords] = await Promise.all([
    services.analytics.prospectSummary(id),
    services.analytics.prospectTimeseries(id, scope, DEFAULT_PROSPECT_RANGE),
    services.analytics.prospectFunnel(id, scope),
    services.analytics.listProspectSessions(id, scope),
  ]);

  const activity: ActivityItem[] = sessionRecords.slice(0, 10).map((s) => ({
    id: s.id,
    who: s.company?.name ?? s.company?.domain ?? s.email ?? "A viewer",
    demoLabel: DEMO_SLUG_LABEL[s.demoSlug] ?? titleCase(s.demoSlug),
    at: s.lastSeenAt,
  }));

  return (
    <ProspectOverview
      prospectId={id}
      sessions={summary.sessions}
      viewers={summary.viewers}
      avgDurationSec={summary.avgDurationSec}
      lastViewedAt={summary.lastViewedAt}
      initialMomentum={momentum}
      funnelStages={funnelStages}
      activity={activity}
    />
  );
}
