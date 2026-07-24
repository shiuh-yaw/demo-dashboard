"use server";

/**
 * Server action backing the org analytics range + demo filters. The client
 * only picks a range and a demo (or "all"); scope + the config->kind map are
 * always re-derived here from the session (see `resolveOrgAnalyticsScope`) and
 * the demo filter is coerced to a known kind (`parseOrgDemoFilter`), never
 * trusted from the request. The demo filter narrows the counts-only inputs -
 * timeseries, funnel, and per-kind breakdown - to a single kind; "all" spans
 * every demo. The funnel is all-time (range-independent) but demo-narrowed.
 */

import { services } from "@/lib/services";
import type {
  AnalyticsTimeRange,
  DemoKindTimeseriesPoint,
  FunnelStage,
  OrgDemoKindBreakdownRow,
} from "@/lib/services/types";
import {
  ORG_DEMO_FILTER_ALL,
  narrowKindMap,
  parseOrgDemoFilter,
} from "@/lib/analytics/org-filter";
import { resolveOrgAnalyticsScope } from "./org-scope";

export interface OrgAnalyticsRangeData {
  timeseries: DemoKindTimeseriesPoint[];
  funnel: FunnelStage[];
  breakdown: OrgDemoKindBreakdownRow[];
}

export async function getOrgAnalyticsForRange(
  range: AnalyticsTimeRange,
  demoFilterRaw: string = ORG_DEMO_FILTER_ALL,
): Promise<OrgAnalyticsRangeData> {
  const { scope, kindByConfigId } = await resolveOrgAnalyticsScope();
  const filter = parseOrgDemoFilter(demoFilterRaw);
  const { kindByConfigId: narrowedMap, demoConfigIds } = narrowKindMap(
    kindByConfigId,
    filter,
  );
  const [timeseries, funnel, breakdown] = await Promise.all([
    filter === ORG_DEMO_FILTER_ALL
      ? services.analytics.orgTimeseries(scope, range)
      : services.analytics.demoKindTimeseries(demoConfigIds, scope, range),
    filter === ORG_DEMO_FILTER_ALL
      ? services.analytics.orgFunnel(scope)
      : services.analytics.demoKindFunnel(demoConfigIds, scope),
    services.analytics.orgDemoKindBreakdown(narrowedMap, scope, range),
  ]);
  return { timeseries, funnel, breakdown };
}
