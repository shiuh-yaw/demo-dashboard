"use server";

/**
 * Server actions for the internal demo-detail page: the "Configure for a
 * Prospect" builder and the two-tier Analytics dashboard's scoped reads.
 *
 * `buildDemoForProspect` builds a branded demo config of one kind for a
 * chosen prospect by reusing the prospect-hub creation path
 * (`createMissingDemos`) - never a fork. Idempotent: if the prospect already
 * runs this kind, the existing config id is returned instead of duplicating.
 *
 * `resolveKindAnalyticsScope` / `getDemoKindTimeseries` back the Analytics
 * dashboard's scope + time-range filters. The client only ever picks which
 * of the three legitimate buckets (All/Mine/Team) to view; the actual
 * prospect-id sets are always re-derived here from the session user, never
 * trusted from the request.
 */

import {
  getSessionUser,
  visibleProspectIds,
  isProspectVisible,
  prospectVisibilityWhere,
} from "@/lib/auth/gtm";
import { createMissingDemos } from "@/lib/actions/prospects";
import { resolveProspectDemos } from "@/lib/services/prospect-demos";
import { services } from "@/lib/services";
import { MAX_PAGE_LIMIT } from "@/lib/services/postgres/pagination";
import type {
  AnalyticsReadScope,
  AnalyticsTimeRange,
  DemoConfigKind,
  DemoKindTimeseriesPoint,
  FunnelStage,
} from "@/lib/services/types";
import {
  computeKindScopes,
  isConfigurableKind,
} from "@/lib/analytics/demo-kind";

export type BuildDemoResult =
  | {
      success: true;
      prospectId: string;
      configId: string;
      /** True when the prospect already had this kind (no new config built). */
      alreadyExisted: boolean;
    }
  | { success: false; error: string };

/**
 * Build (or resolve the existing) demo config of `kind` for `prospectId`.
 * Visibility-gated server-side; the underlying `createMissingDemos` re-checks
 * mutation permission, so this never widens access.
 */
export async function buildDemoForProspect(
  kind: string,
  prospectId: string,
): Promise<BuildDemoResult> {
  if (!isConfigurableKind(kind)) {
    return {
      success: false,
      error: "This demo type can't be configured for a prospect yet.",
    };
  }
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };

  // Defense in depth beyond the already-scoped picker: never reveal a
  // prospect the user cannot see.
  const visible = await visibleProspectIds(user);
  if (!isProspectVisible(visible, prospectId)) {
    return { success: false, error: "Prospect not found" };
  }

  const prospect = await services.prospects.get(prospectId);
  if (!prospect) return { success: false, error: "Prospect not found" };

  const existingDemos = await resolveProspectDemos(prospectId);
  const existingId = existingDemos[kind];
  if (existingId) {
    return { success: true, prospectId, configId: existingId, alreadyExisted: true };
  }

  const result = await createMissingDemos(prospectId, { [kind]: true });
  if (!result.success) return { success: false, error: result.error };

  const configId = result.data.demos[kind];
  if (!configId) return { success: false, error: "Failed to build demo" };
  return { success: true, prospectId, configId, alreadyExisted: false };
}

/** The three legitimate scope buckets the Analytics dashboard filter offers. */
export type KindScopeFilter = "all" | "mine" | "team";

/**
 * Resolve `kind`'s demo-config ids plus the Tier-1 `AnalyticsReadScope` for
 * `filter`, entirely server-side. "all" (or no session) spans every
 * prospect; "mine"/"team" narrow to prospect-id sets derived from the
 * caller's own session - the client cannot widen or forge these sets, it can
 * only choose which bucket to look at.
 */
export async function resolveKindAnalyticsScope(
  kind: DemoConfigKind,
  filter: KindScopeFilter,
): Promise<{ demoConfigIds: string[]; scope: AnalyticsReadScope }> {
  // Global id lookup for the kind (mirrors org-scope.ts's kindByConfigId) -
  // not an access-control boundary itself; unpaginated so a kind with more
  // than one page of configs is never silently under-counted.
  const [kindConfigs, user] = await Promise.all([
    services.demoConfigs.listIdKinds({ kind }),
    getSessionUser(),
  ]);
  const demoConfigIds = kindConfigs.map((c) => c.id);

  if (filter === "all" || !user) {
    return { demoConfigIds, scope: "all" };
  }

  const [memberships, visible] = await Promise.all([
    services.teams.membershipsForUser(user.id),
    visibleProspectIds(user),
  ]);
  const teamIds = new Set(memberships.map((m) => m.teamId));
  const owner = { id: user.id, dynamicUserId: user.dynamicUserId };
  // Bounded join fetch (not a paginated list) - every visible prospect,
  // capped at MAX_PAGE_LIMIT, to bucket into the My/Team scopes.
  const prospectsPage = await services.prospects.list({
    where: prospectVisibilityWhere(visible),
    limit: MAX_PAGE_LIMIT,
  });
  const { mine, team } = computeKindScopes(owner, prospectsPage.items, teamIds);
  return { demoConfigIds, scope: filter === "mine" ? mine : team };
}

/**
 * Sessions-over-time chart data for the Analytics dashboard. Counts only -
 * see `AnalyticsService.demoKindTimeseries`.
 */
export async function getDemoKindTimeseries(
  kind: DemoConfigKind,
  filter: KindScopeFilter,
  range: AnalyticsTimeRange,
): Promise<DemoKindTimeseriesPoint[]> {
  const { demoConfigIds, scope } = await resolveKindAnalyticsScope(kind, filter);
  return services.analytics.demoKindTimeseries(demoConfigIds, scope, range);
}

/**
 * Engagement funnel for the Analytics dashboard's demo-fit panel. Counts only,
 * same server-side scope resolution as `getDemoKindTimeseries` - see
 * `AnalyticsService.demoKindFunnel`.
 */
export async function getDemoKindFunnel(
  kind: DemoConfigKind,
  filter: KindScopeFilter,
  range: AnalyticsTimeRange,
): Promise<FunnelStage[]> {
  const { demoConfigIds, scope } = await resolveKindAnalyticsScope(kind, filter);
  return services.analytics.demoKindFunnel(demoConfigIds, scope, range);
}
