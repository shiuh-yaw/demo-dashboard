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
import {
  getAllProspectProfiles,
  getOverviewStats,
} from "@/lib/actions/prospects";
import { getScopeContext } from "@/lib/actions/scope";
import { services } from "@/lib/services";
import { toOverviewRow } from "@/lib/overview-row";
import { OverviewMetrics } from "./components/overview-metrics";
import { MyProspects } from "./components/my-prospects";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const user = await requireUser();
  const [{ profiles, scope }, scopeCtx] = await Promise.all([
    getAllProspectProfiles(),
    getScopeContext(),
  ]);

  // First page rows seed the infinite list (one batched summary query for
  // this page); the stat cards span EVERY prospect in scope, not just this
  // page, via a separate lean org-wide aggregate.
  const [summaries, stats] = await Promise.all([
    services.analytics.prospectSummaries(profiles.items.map((p) => p.id)),
    getOverviewStats(scope),
  ]);
  const initialPage = {
    items: profiles.items.map((p) => toOverviewRow(p, summaries)),
    nextCursor: profiles.nextCursor,
  };

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
          prospects={stats.prospects}
          activeThisWeek={stats.activeThisWeek}
          sessions={stats.sessions}
          viewers={stats.viewers}
        />
      </div>

      <div className="lg:min-h-0 lg:flex-1">
        <MyProspects
          initialPage={initialPage}
          scope={scope}
          canCreate={canCreateRecord(user)}
          filter={scopeCtx.filter}
          isAdmin={scopeCtx.isAdmin}
          onTeam={scopeCtx.onTeam}
        />
      </div>
    </div>
  );
}
