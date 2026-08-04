/**
 * Analytics - the all-demos-combined org/team roll-up (the "Engagement" tab).
 * Scope is resolved server-side (admins see everything, everyone else their
 * own + team prospects); every read is counts-only, no per-prospect identity.
 * Renders the empty state only when there is genuinely zero engagement
 * anywhere, otherwise the dashboard. The public-catalog funnel is a separate
 * report under the Catalog tab (`./catalog`).
 */

import { requireUser } from "@/lib/auth/gtm";
import { services } from "@/lib/services";
import { availableKinds } from "@/lib/analytics/org-filter";
import { AnalyticsEmpty } from "./analytics-empty";
import {
  AnalyticsDashboard,
  DEFAULT_ORG_RANGE,
} from "./analytics-dashboard";
import { resolveOrgAnalyticsScope } from "./org-scope";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireUser();

  const { scope, kindByConfigId } = await resolveOrgAnalyticsScope();

  // The all-time funnel doubles as the "any data at all" gate: no base-stage
  // views in scope means nothing to show yet.
  const [funnelStages, initialTimeseries, initialBreakdown] = await Promise.all([
    services.analytics.orgFunnel(scope),
    services.analytics.orgTimeseries(scope, DEFAULT_ORG_RANGE),
    services.analytics.orgDemoKindBreakdown(kindByConfigId, scope, DEFAULT_ORG_RANGE),
  ]);
  const hasAnyData = (funnelStages[0]?.count ?? 0) > 0;
  const kinds = availableKinds(kindByConfigId);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Org-wide sessions, engagement, and demo fit across every demo.
      </p>
      {hasAnyData ? (
        <AnalyticsDashboard
          initialTimeseries={initialTimeseries}
          funnelStages={funnelStages}
          initialBreakdown={initialBreakdown}
          kinds={kinds}
        />
      ) : (
        <AnalyticsEmpty />
      )}
    </div>
  );
}
