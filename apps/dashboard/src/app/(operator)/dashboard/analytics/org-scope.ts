/**
 * Server-side scope resolver for the org/team analytics roll-up. The read
 * scope (Tier 1) is always re-derived here from the session user - never
 * trusted from the client: admins get "all", everyone else the prospect-id
 * set they own or share a team with. `kindByConfigId` maps every demo config
 * to its kind for the per-kind comparison (ShareLink carries no DemoConfig
 * relation, so the caller resolves the mapping). Counts-only downstream.
 */

import { getSessionUser, visibleProspectIds } from "@/lib/auth/gtm";
import { services } from "@/lib/services";
import type { AnalyticsReadScope, DemoConfigKind } from "@/lib/services/types";

export interface OrgAnalyticsScope {
  scope: AnalyticsReadScope;
  kindByConfigId: Map<string, DemoConfigKind>;
}

export async function resolveOrgAnalyticsScope(): Promise<OrgAnalyticsScope> {
  const user = await getSessionUser();
  const [scope, configs] = await Promise.all([
    user ? visibleProspectIds(user) : Promise.resolve(new Set<string>()),
    // Global id->kind lookup, not an access-control boundary itself (scope
    // enforcement happens downstream on the VisitorSession/ShareLink side) -
    // unpaginated so an org with more than one page of configs never
    // silently drops kinds from the comparison.
    services.demoConfigs.listIdKinds({}),
  ]);
  const kindByConfigId = new Map<string, DemoConfigKind>(
    configs.map((c) => [c.id, c.kind]),
  );
  return { scope, kindByConfigId };
}
