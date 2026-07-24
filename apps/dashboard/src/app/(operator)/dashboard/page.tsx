/**
 * GTM overview home. Actionable signal row + the signed-in user's prospects
 * (visibility-scoped). Engagement values come from the analytics contract.
 * The "Getting started" checklist used to render here as a card (Phase 3);
 * it now lives in the top bar (Phase 7 IA relayout, see
 * `components/getting-started-popover.tsx`) since that's the one place
 * reachable from every operator page, not just this one.
 */

import { requireUser } from "@/lib/auth/gtm";
import { canCreateRecord } from "@/lib/auth/policy";
import { getAllProspectProfiles } from "@/lib/actions/prospects";
import { getScopeContext } from "@/lib/actions/scope";
import { services } from "@/lib/services";
import { OverviewMetrics } from "./components/overview-metrics";
import { MyProspects, type MyProspectRowView } from "./components/my-prospects";

export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function OverviewPage() {
  const user = await requireUser();
  const [{ profiles }, scope] = await Promise.all([
    getAllProspectProfiles(),
    getScopeContext(),
  ]);

  // One batched query instead of N per-prospect round-trips.
  const summaries = await services.analytics.prospectSummaries(
    profiles.items.map((p) => p.id),
  );
  const zero = { sessions: 0, viewers: 0, lastViewedAt: null };

  const now = Date.now();
  const rows: MyProspectRowView[] = profiles.items.map((p) => {
    const s = summaries.get(p.id) ?? zero;
    return {
      id: p.id,
      name: p.name,
      domain: p.companyUrl ?? null,
      demos: Object.values(p.demos).filter(Boolean).length,
      sessions: s.sessions,
      viewers: s.viewers,
      lastViewedAt: s.lastViewedAt,
      updatedAt: p.updatedAt,
    };
  });

  const activeThisWeek = rows.filter((r) => {
    if (!r.lastViewedAt) return false;
    const t = new Date(r.lastViewedAt).getTime();
    return !Number.isNaN(t) && now - t <= WEEK_MS;
  }).length;
  const sessions = rows.reduce((sum, r) => sum + r.sessions, 0);
  const viewers = rows.reduce((sum, r) => sum + r.viewers, 0);

  return (
    // lg: the outlet no longer needs to scroll this page - it fills the
    // available height and the prospects table becomes the sole scroll
    // region (see MyProspects). Below lg: no fixed height, page scrolls as
    // a normal block-flow column like every other operator route.
    <div className="flex flex-col gap-8 lg:h-full lg:min-h-0">
      <div className="shrink-0">
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your prospects and how they are engaging with the demos you have
          shared.
        </p>
      </div>

      <div className="shrink-0">
        <OverviewMetrics
          prospects={rows.length}
          activeThisWeek={activeThisWeek}
          sessions={sessions}
          viewers={viewers}
        />
      </div>

      <div className="lg:min-h-0 lg:flex-1">
        <MyProspects
          rows={rows}
          canCreate={canCreateRecord(user)}
          filter={scope.filter}
          isAdmin={scope.isAdmin}
          onTeam={scope.onTeam}
        />
      </div>
    </div>
  );
}
