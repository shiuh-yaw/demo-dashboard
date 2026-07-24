"use server";

/**
 * Server action backing the prospect Overview momentum chart's time-range
 * filter. The client only picks a range; the prospect read scope is always
 * re-derived here from the session user, never trusted from the request, and
 * `prospectTimeseries` fail-closes when the prospect is outside that scope.
 */

import { getSessionUser, visibleProspectIds } from "@/lib/auth/gtm";
import { services } from "@/lib/services";
import type {
  AnalyticsTimeRange,
  DemoKindTimeseriesPoint,
} from "@/lib/services/types";

export async function getProspectMomentum(
  prospectId: string,
  range: AnalyticsTimeRange,
): Promise<DemoKindTimeseriesPoint[]> {
  const user = await getSessionUser();
  const scope = user ? await visibleProspectIds(user) : new Set<string>();
  return services.analytics.prospectTimeseries(prospectId, scope, range);
}
