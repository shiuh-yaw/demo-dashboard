/**
 * Zeroed analytics read model. Fixes the call-site contract without touching
 * the database - kept as a fallback the real `PostgresAnalyticsService`
 * (postgres/analytics.ts) mirrors behind the same interface.
 */

import type {
  AnalyticsReadScope,
  AnalyticsService,
  AnalyticsTimeRange,
  CatalogFunnel,
  CatalogDemoTimeseriesPoint,
  ContactView,
  DemoConfigKind,
  DemoKindTimeseriesPoint,
  DemoSummary,
  FunnelStage,
  OrgContactView,
  OrgDemoKindBreakdownRow,
  OverviewEngagement,
  Page,
  PageOptions,
  ProspectSummary,
  VisitorSessionView,
} from "./types";

export class StubAnalyticsService implements AnalyticsService {
  async demoSummary(_demoConfigId: string): Promise<DemoSummary> {
    return { sessions: 0, viewers: 0, avgDurationSec: 0, lastViewedAt: null };
  }

  async demoKindSummary(
    _demoConfigIds: readonly string[],
    _scope: AnalyticsReadScope,
  ): Promise<DemoSummary> {
    return { sessions: 0, viewers: 0, avgDurationSec: 0, lastViewedAt: null };
  }

  async demoKindTimeseries(
    _demoConfigIds: readonly string[],
    _scope: AnalyticsReadScope,
    _range: AnalyticsTimeRange,
    _now?: Date,
  ): Promise<DemoKindTimeseriesPoint[]> {
    return [];
  }

  async demoKindFunnel(
    _demoConfigIds: readonly string[],
    _scope: AnalyticsReadScope,
    _range?: AnalyticsTimeRange,
    _now?: Date,
  ): Promise<FunnelStage[]> {
    return [];
  }

  async prospectSummary(_prospectId: string): Promise<ProspectSummary> {
    return { sessions: 0, viewers: 0, avgDurationSec: 0, lastViewedAt: null };
  }

  async prospectSummaries(
    prospectIds: string[],
  ): Promise<Map<string, ProspectSummary>> {
    const out = new Map<string, ProspectSummary>();
    for (const id of prospectIds) {
      out.set(id, { sessions: 0, viewers: 0, avgDurationSec: 0, lastViewedAt: null });
    }
    return out;
  }

  async overviewEngagement(
    _prospectIds: string[],
    _now?: Date,
  ): Promise<OverviewEngagement> {
    return { sessions: 0, viewers: 0, activeThisWeek: 0 };
  }

  async listProspectContacts(
    _prospectId: string,
    _scope: AnalyticsReadScope,
  ): Promise<ContactView[]> {
    return [];
  }

  async listProspectSessions(
    _prospectId: string,
    _scope: AnalyticsReadScope,
    _opts?: { demoConfigId?: string },
  ): Promise<VisitorSessionView[]> {
    return [];
  }

  async listContactSessions(
    _prospectId: string,
    _contactKey: string,
    _scope: AnalyticsReadScope,
  ): Promise<VisitorSessionView[]> {
    return [];
  }

  async listAllContacts(
    _scope: AnalyticsReadScope,
    _page?: PageOptions,
  ): Promise<Page<OrgContactView>> {
    return { items: [], nextCursor: null };
  }

  async listAllContactSessions(
    _contactKey: string,
    _scope: AnalyticsReadScope,
  ): Promise<VisitorSessionView[]> {
    return [];
  }

  async prospectTimeseries(
    _prospectId: string,
    _scope: AnalyticsReadScope,
    _range: AnalyticsTimeRange,
    _now?: Date,
  ): Promise<DemoKindTimeseriesPoint[]> {
    return [];
  }

  async prospectFunnel(
    _prospectId: string,
    _scope: AnalyticsReadScope,
    _range?: AnalyticsTimeRange,
    _now?: Date,
  ): Promise<FunnelStage[]> {
    return [];
  }

  async orgTimeseries(
    _scope: AnalyticsReadScope,
    _range: AnalyticsTimeRange,
    _now?: Date,
  ): Promise<DemoKindTimeseriesPoint[]> {
    return [];
  }

  async orgFunnel(
    _scope: AnalyticsReadScope,
    _range?: AnalyticsTimeRange,
    _now?: Date,
  ): Promise<FunnelStage[]> {
    return [];
  }

  async orgDemoKindBreakdown(
    _kindByConfigId: ReadonlyMap<string, DemoConfigKind>,
    _scope: AnalyticsReadScope,
    _range?: AnalyticsTimeRange,
    _now?: Date,
  ): Promise<OrgDemoKindBreakdownRow[]> {
    return [];
  }

  async catalogFunnel(): Promise<CatalogFunnel> {
    return { visits: 0, uniqueVisitors: 0, byDemo: [] };
  }

  async catalogDemoTimeseries(
    _slug: string,
    _range: AnalyticsTimeRange,
    _now?: Date,
  ): Promise<CatalogDemoTimeseriesPoint[]> {
    return [];
  }
}
