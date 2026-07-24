/**
 * Unit coverage for `PostgresAnalyticsService`. A hand-rolled in-memory fake
 * stands in for the `prisma.visitorSession.findMany` slice (relation filter +
 * include) - real-database coverage lives in the CI migration dry-run job.
 */

import { describe, expect, it } from "vitest";
import { PostgresAnalyticsService } from "../postgres/analytics";
import type {
  AnalyticsPrismaClient,
  AnalyticsSessionRow,
  AnalyticsSessionWhere,
} from "../postgres/analytics";

function matches(row: AnalyticsSessionRow, where: AnalyticsSessionWhere): boolean {
  if (where.isInternal !== undefined && row.isInternal !== where.isInternal) {
    return false;
  }
  if (where.startedAt?.gte !== undefined) {
    if (row.startedAt.getTime() < where.startedAt.gte.getTime()) return false;
  }
  if (where.shareLinkId?.not === null) {
    if (row.shareLink == null) return false;
  }
  const sl = where.shareLink;
  if (sl) {
    if (!row.shareLink) return false;
    if (typeof sl.prospectId === "string") {
      if (row.shareLink.prospectId !== sl.prospectId) return false;
    } else if (sl.prospectId && "in" in sl.prospectId) {
      if (!sl.prospectId.in.includes(row.shareLink.prospectId)) return false;
    }
    if (typeof sl.demoConfigId === "string") {
      if (row.shareLink.demoConfigId !== sl.demoConfigId) return false;
    } else if (sl.demoConfigId && "in" in sl.demoConfigId) {
      if (!sl.demoConfigId.in.includes(row.shareLink.demoConfigId)) return false;
    }
  }
  const ev = where.events?.some;
  if (ev) {
    const hit = row.events.some((e) => {
      if (typeof ev.type === "string" && e.type !== ev.type) return false;
      if (ev.type && typeof ev.type !== "string" && !ev.type.in.includes(e.type)) {
        return false;
      }
      if (ev.name !== undefined && e.name !== ev.name) return false;
      return true;
    });
    if (!hit) return false;
  }
  return true;
}

function fakePrisma(rows: AnalyticsSessionRow[]): AnalyticsPrismaClient {
  return {
    visitorSession: {
      async findMany({ where }) {
        return rows.filter((r) => matches(r, where)).map((r) => ({ ...r }));
      },
      async count({ where }) {
        return rows.filter((r) => matches(r, where)).length;
      },
    },
  };
}

function session(
  overrides: Partial<AnalyticsSessionRow> & {
    id: string;
    anonId: string;
    prospectId: string;
    demoConfigId: string;
  },
): AnalyticsSessionRow {
  const { prospectId, demoConfigId, ...rest } = overrides;
  return {
    demoSlug: "wallet",
    startedAt: new Date("2026-07-20T10:00:00Z"),
    lastSeenAt: new Date("2026-07-20T10:05:00Z"),
    isInternal: false,
    enrichment: null,
    events: [],
    shareLink: { prospectId, demoConfigId },
    ...rest,
  };
}

describe("PostgresAnalyticsService", () => {
  it("aggregates prospect sessions, unique viewers, and last viewed", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({ id: "s1", anonId: "a1", prospectId: "p1", demoConfigId: "d1" }),
        session({ id: "s2", anonId: "a1", prospectId: "p1", demoConfigId: "d1" }),
        session({
          id: "s3",
          anonId: "a2",
          prospectId: "p1",
          demoConfigId: "d2",
          lastSeenAt: new Date("2026-07-21T12:00:00Z"),
        }),
        session({ id: "s4", anonId: "a9", prospectId: "p2", demoConfigId: "d9" }),
      ]),
    );

    const summary = await svc.prospectSummary("p1");
    expect(summary.sessions).toBe(3);
    expect(summary.viewers).toBe(2);
    expect(summary.lastViewedAt).toBe("2026-07-21T12:00:00.000Z");
  });

  it("computes avg session duration across a prospect's non-internal sessions", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-07-20T10:00:00Z"),
          lastSeenAt: new Date("2026-07-20T10:02:00Z"), // 120s
        }),
        session({
          id: "s2",
          anonId: "a2",
          prospectId: "p1",
          demoConfigId: "d2",
          startedAt: new Date("2026-07-20T11:00:00Z"),
          lastSeenAt: new Date("2026-07-20T11:01:00Z"), // 60s
        }),
        // Internal self-view - excluded from the average.
        session({
          id: "s3",
          anonId: "a3",
          prospectId: "p1",
          demoConfigId: "d1",
          isInternal: true,
          startedAt: new Date("2026-07-20T12:00:00Z"),
          lastSeenAt: new Date("2026-07-20T13:00:00Z"),
        }),
      ]),
    );

    const summary = await svc.prospectSummary("p1");
    expect(summary.avgDurationSec).toBe(90); // (120 + 60) / 2

    const map = await svc.prospectSummaries(["p1", "p2"]);
    expect(map.get("p1")?.avgDurationSec).toBe(90);
    expect(map.get("p2")?.avgDurationSec).toBe(0);
  });

  it("excludes internal self-views from aggregates", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({ id: "s1", anonId: "a1", prospectId: "p1", demoConfigId: "d1" }),
        session({
          id: "s2",
          anonId: "a2",
          prospectId: "p1",
          demoConfigId: "d1",
          isInternal: true,
        }),
      ]),
    );
    const summary = await svc.prospectSummary("p1");
    expect(summary.sessions).toBe(1);
    expect(summary.viewers).toBe(1);
  });

  it("scopes demoSummary to a single demo config and computes duration", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-07-20T10:00:00Z"),
          lastSeenAt: new Date("2026-07-20T10:02:00Z"),
        }),
        session({ id: "s2", anonId: "a2", prospectId: "p1", demoConfigId: "d2" }),
      ]),
    );
    const demo = await svc.demoSummary("d1");
    expect(demo.sessions).toBe(1);
    expect(demo.avgDurationSec).toBe(120);
    expect(demo.lastViewedAt).toBe("2026-07-20T10:02:00.000Z");
  });

  it("batches prospect summaries and zero-fills ids with no data", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({ id: "s1", anonId: "a1", prospectId: "p1", demoConfigId: "d1" }),
      ]),
    );
    const map = await svc.prospectSummaries(["p1", "p2"]);
    expect(map.get("p1")?.sessions).toBe(1);
    expect(map.get("p2")).toEqual({
      sessions: 0,
      viewers: 0,
      avgDurationSec: 0,
      lastViewedAt: null,
    });
  });

  it("returns empty for a prospect outside the read scope", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({ id: "s1", anonId: "a1", prospectId: "p1", demoConfigId: "d1" }),
      ]),
    );
    const scope = new Set(["p2"]);
    expect(await svc.listProspectContacts("p1", scope)).toEqual([]);
    expect(await svc.listProspectSessions("p1", scope)).toEqual([]);
    // "all" scope always passes.
    expect((await svc.listProspectSessions("p1", "all")).length).toBe(1);
  });

  it("groups contacts by viewer with company + captured identity", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          demoSlug: "wallet",
          enrichment: { company: { name: "Acme", domain: "acme.com" } },
          events: [
            {
              type: "milestone",
              name: "authenticated",
              props: { email: "jo@acme.com", dynamicUserId: "dyn_1" },
              ts: new Date("2026-07-20T10:01:00Z"),
            },
          ],
        }),
        session({
          id: "s2",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d2",
          demoSlug: "earn",
          lastSeenAt: new Date("2026-07-22T09:00:00Z"),
        }),
      ]),
    );
    const contacts = await svc.listProspectContacts("p1", "all");
    expect(contacts).toHaveLength(1);
    const c = contacts[0]!;
    expect(c.key).toBe("jo@acme.com");
    expect(c.email).toBe("jo@acme.com");
    expect(c.company).toEqual({ name: "Acme", domain: "acme.com" });
    expect(c.sessionCount).toBe(2);
    expect(c.demoSlugs).toEqual(["earn", "wallet"]);
    expect(c.lastSeenAt).toBe("2026-07-22T09:00:00.000Z");
  });

  it("collapses two anonIds sharing the same captured email into one contact", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          demoSlug: "wallet",
          startedAt: new Date("2026-07-18T10:00:00Z"),
          lastSeenAt: new Date("2026-07-18T10:05:00Z"),
          events: [
            {
              type: "milestone",
              name: "authenticated",
              props: { email: "eric.tesenair@dynamic.xyz" },
              ts: new Date("2026-07-18T10:01:00Z"),
            },
          ],
        }),
        // A second, distinct browser/visit (different anonId) - same person,
        // captured under the same email. Must collapse to the same contact.
        session({
          id: "s2",
          anonId: "a2",
          prospectId: "p1",
          demoConfigId: "d2",
          demoSlug: "earn",
          startedAt: new Date("2026-07-20T09:00:00Z"),
          lastSeenAt: new Date("2026-07-20T09:10:00Z"),
          events: [
            {
              type: "milestone",
              name: "authenticated",
              props: { email: "eric.tesenair@dynamic.xyz" },
              ts: new Date("2026-07-20T09:01:00Z"),
            },
          ],
        }),
      ]),
    );

    const contacts = await svc.listProspectContacts("p1", "all");
    expect(contacts).toHaveLength(1);
    const c = contacts[0]!;
    expect(c.key).toBe("eric.tesenair@dynamic.xyz");
    expect(c.sessionCount).toBe(2);
    expect(c.firstSeenAt).toBe("2026-07-18T10:00:00.000Z");
    expect(c.lastSeenAt).toBe("2026-07-20T09:10:00.000Z");
    expect(c.demoSlugs).toEqual(["earn", "wallet"]);
  });
});

describe("PostgresAnalyticsService.listContactSessions", () => {
  function contactFixture() {
    return new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-07-18T10:00:00Z"),
          lastSeenAt: new Date("2026-07-18T10:05:00Z"),
          events: [
            {
              type: "milestone",
              name: "authenticated",
              props: { email: "eric.tesenair@dynamic.xyz" },
              ts: new Date("2026-07-18T10:01:00Z"),
            },
          ],
        }),
        // Same person, different anonId - must appear in the same drill-down.
        session({
          id: "s2",
          anonId: "a2",
          prospectId: "p1",
          demoConfigId: "d2",
          startedAt: new Date("2026-07-20T09:00:00Z"),
          lastSeenAt: new Date("2026-07-20T09:10:00Z"),
          events: [
            {
              type: "milestone",
              name: "authenticated",
              props: { email: "eric.tesenair@dynamic.xyz" },
              ts: new Date("2026-07-20T09:01:00Z"),
            },
          ],
        }),
        // A different contact on the same prospect - must never leak in.
        session({ id: "s3", anonId: "a9", prospectId: "p1", demoConfigId: "d1" }),
      ]),
    );
  }

  it("returns only the sessions belonging to the contact key, newest first", async () => {
    const sessions = await contactFixture().listContactSessions(
      "p1",
      "eric.tesenair@dynamic.xyz",
      "all",
    );
    expect(sessions.map((s) => s.id)).toEqual(["s2", "s1"]);
  });

  it("returns empty for a contact key with no sessions", async () => {
    const sessions = await contactFixture().listContactSessions(
      "p1",
      "nobody@nowhere.com",
      "all",
    );
    expect(sessions).toEqual([]);
  });

  it("respects the read scope, returning empty when the prospect is out of view", async () => {
    const sessions = await contactFixture().listContactSessions(
      "p1",
      "eric.tesenair@dynamic.xyz",
      new Set(["p2"]),
    );
    expect(sessions).toEqual([]);
  });
});

describe("PostgresAnalyticsService.demoKindSummary (Tier-1 aggregate)", () => {
  // Two prospects run the same demo kind via configs d1/d2 (p1) and d3 (p2).
  // p2 is outside a scoped viewer's visibility.
  function kindFixture() {
    return new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-07-20T10:00:00Z"),
          lastSeenAt: new Date("2026-07-20T10:02:00Z"),
        }),
        session({ id: "s2", anonId: "a1", prospectId: "p1", demoConfigId: "d2" }),
        session({
          id: "s3",
          anonId: "a2",
          prospectId: "p2",
          demoConfigId: "d3",
          lastSeenAt: new Date("2026-07-25T12:00:00Z"),
        }),
        // Internal self-view - excluded from every count.
        session({
          id: "s4",
          anonId: "a3",
          prospectId: "p2",
          demoConfigId: "d3",
          isInternal: true,
        }),
        // A different kind's config - never in the id set, never counted.
        session({ id: "s5", anonId: "a9", prospectId: "p1", demoConfigId: "other" }),
      ]),
    );
  }

  it("counts across ALL prospects of the kind incl. ones out of visibility", async () => {
    const summary = await kindFixture().demoKindSummary(
      ["d1", "d2", "d3"],
      "all",
    );
    // s1+s2 (p1) + s3 (p2); s4 internal and s5 other-kind excluded.
    expect(summary.sessions).toBe(3);
    expect(summary.viewers).toBe(2); // a1, a2
    expect(summary.lastViewedAt).toBe("2026-07-25T12:00:00.000Z"); // p2's session
  });

  it("narrows the aggregate to a prospect scope without leaking the rest", async () => {
    // A scoped viewer whose visibility is p1 only: the out-of-scope p2
    // session (s3) drops out of the narrowed aggregate entirely.
    const mine = await kindFixture().demoKindSummary(
      ["d1", "d2", "d3"],
      new Set(["p1"]),
    );
    expect(mine.sessions).toBe(2); // s1, s2
    expect(mine.viewers).toBe(1); // a1
    expect(mine.lastViewedAt).toBe("2026-07-20T10:05:00.000Z"); // p2's 07-25 excluded
  });

  it("returns zeros for an empty config-id set", async () => {
    const summary = await kindFixture().demoKindSummary([], "all");
    expect(summary).toEqual({
      sessions: 0,
      viewers: 0,
      avgDurationSec: 0,
      lastViewedAt: null,
    });
  });
});

describe("PostgresAnalyticsService.demoKindTimeseries (Tier-1 time series)", () => {
  // p1 runs d1/d2, p2 runs d3 - mirrors the demoKindSummary fixture above so
  // the same scope-narrowing guarantees apply to the bucketed series.
  function timeseriesFixture() {
    return new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-07-20T10:00:00Z"),
          lastSeenAt: new Date("2026-07-20T10:02:00Z"),
        }),
        session({
          id: "s2",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-07-20T14:00:00Z"),
          lastSeenAt: new Date("2026-07-20T14:02:00Z"),
        }),
        session({
          id: "s3",
          anonId: "a2",
          prospectId: "p1",
          demoConfigId: "d2",
          startedAt: new Date("2026-07-21T09:00:00Z"),
          lastSeenAt: new Date("2026-07-21T09:02:00Z"),
        }),
        session({
          id: "s4",
          anonId: "a9",
          prospectId: "p2",
          demoConfigId: "d3",
          startedAt: new Date("2026-07-21T11:00:00Z"),
          lastSeenAt: new Date("2026-07-21T11:02:00Z"),
        }),
        // Internal self-view - excluded from every bucket.
        session({
          id: "s5",
          anonId: "a3",
          prospectId: "p2",
          demoConfigId: "d3",
          startedAt: new Date("2026-07-21T11:30:00Z"),
          isInternal: true,
        }),
        // A different kind's config - never in the id set, never counted.
        session({
          id: "s6",
          anonId: "a9",
          prospectId: "p1",
          demoConfigId: "other",
          startedAt: new Date("2026-07-21T12:00:00Z"),
        }),
      ]),
    );
  }

  const NOW = new Date("2026-07-22T00:00:00Z");

  it("buckets sessions by UTC day, counting sessions and unique viewers", async () => {
    const points = await timeseriesFixture().demoKindTimeseries(
      ["d1", "d2", "d3"],
      "all",
      "all",
      NOW,
    );
    const byDate = new Map(points.map((p) => [p.date, p]));
    // 07-20: s1+s2, both anonId a1 -> 2 sessions, 1 viewer.
    expect(byDate.get("2026-07-20")).toEqual({
      date: "2026-07-20",
      sessions: 2,
      viewers: 1,
    });
    // 07-21: s3 (a2) + s4 (a9) -> 2 sessions, 2 viewers. s5 (internal) and
    // s6 (other kind) excluded.
    expect(byDate.get("2026-07-21")).toEqual({
      date: "2026-07-21",
      sessions: 2,
      viewers: 2,
    });
    // Dates are ascending.
    expect(points.map((p) => p.date)).toEqual(["2026-07-20", "2026-07-21"]);
  });

  it("narrows to a prospect scope without leaking the rest of the series", async () => {
    const points = await timeseriesFixture().demoKindTimeseries(
      ["d1", "d2", "d3"],
      new Set(["p1"]),
      "all",
      NOW,
    );
    const byDate = new Map(points.map((p) => [p.date, p]));
    expect(byDate.get("2026-07-20")).toEqual({
      date: "2026-07-20",
      sessions: 2,
      viewers: 1,
    });
    // p2's 07-21 session (s4) is scoped out; only p1's s3 remains.
    expect(byDate.get("2026-07-21")).toEqual({
      date: "2026-07-21",
      sessions: 1,
      viewers: 1,
    });
  });

  it("excludes sessions outside the requested range and zero-fills the window", async () => {
    // A 7d window ending at NOW (2026-07-22) starts 2026-07-15; every
    // fixture session falls inside it, but the empty in-between days must
    // still appear as zero-buckets so the chart axis is continuous.
    const points = await timeseriesFixture().demoKindTimeseries(
      ["d1", "d2", "d3"],
      "all",
      "7d",
      NOW,
    );
    expect(points).toHaveLength(8); // 07-15..07-22 inclusive
    expect(points[0]!.date).toBe("2026-07-15");
    expect(points[points.length - 1]!.date).toBe("2026-07-22");
    const zeroDay = points.find((p) => p.date === "2026-07-16");
    expect(zeroDay).toEqual({ date: "2026-07-16", sessions: 0, viewers: 0 });
  });

  it("drops sessions older than the range cutoff", async () => {
    const points = await timeseriesFixture().demoKindTimeseries(
      ["d1", "d2", "d3"],
      "all",
      "7d",
      new Date("2026-09-01T00:00:00Z"), // every fixture session is now stale
    );
    expect(points.every((p) => p.sessions === 0)).toBe(true);
  });

  it("never surfaces prospect identity in a time-series point", async () => {
    const points = await timeseriesFixture().demoKindTimeseries(
      ["d1", "d2", "d3"],
      "all",
      "all",
      NOW,
    );
    for (const p of points) {
      expect(Object.keys(p).sort()).toEqual(["date", "sessions", "viewers"]);
    }
  });

  it("returns an empty series for an empty config-id set", async () => {
    const points = await timeseriesFixture().demoKindTimeseries([], "all", "all", NOW);
    expect(points).toEqual([]);
  });
});

describe("PostgresAnalyticsService.demoKindFunnel (Tier-1 funnel)", () => {
  // p1 runs d1/d2, p2 runs d3 - mirrors the demoKindSummary/timeseries
  // fixtures so the same scope-narrowing guarantees apply to the funnel.
  // s1 pageview-only (viewed), s2 step (interacted), s3 authenticated
  // (interacted + authenticated). s4 is an out-of-scope prospect's step.
  function funnelFixture() {
    return new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          events: [
            { type: "pageview", name: "view", props: null, ts: new Date("2026-07-20T10:00:00Z") },
          ],
        }),
        session({
          id: "s2",
          anonId: "a2",
          prospectId: "p1",
          demoConfigId: "d2",
          events: [
            { type: "step", name: "select-asset", props: null, ts: new Date("2026-07-20T10:01:00Z") },
          ],
        }),
        session({
          id: "s3",
          anonId: "a3",
          prospectId: "p1",
          demoConfigId: "d1",
          events: [
            {
              type: "milestone",
              name: "authenticated",
              props: { email: "jo@acme.com" },
              ts: new Date("2026-07-20T10:02:00Z"),
            },
          ],
        }),
        // Out-of-scope prospect p2: interacted + authenticated, must contribute
        // nothing once the scope narrows to p1.
        session({
          id: "s4",
          anonId: "a9",
          prospectId: "p2",
          demoConfigId: "d3",
          events: [
            { type: "step", name: "select-asset", props: null, ts: new Date("2026-07-21T09:00:00Z") },
            {
              type: "milestone",
              name: "authenticated",
              props: null,
              ts: new Date("2026-07-21T09:01:00Z"),
            },
          ],
        }),
        // Internal self-view - excluded from every stage.
        session({
          id: "s5",
          anonId: "a4",
          prospectId: "p1",
          demoConfigId: "d1",
          isInternal: true,
          events: [
            { type: "step", name: "x", props: null, ts: new Date("2026-07-20T10:03:00Z") },
          ],
        }),
      ]),
    );
  }

  it("counts interacted (steps) and authenticated (milestone) across the kind", async () => {
    const funnel = await funnelFixture().demoKindFunnel(["d1", "d2", "d3"], "all");
    // Viewed: s1,s2,s3,s4 = 4 (s5 internal excluded). Interacted: s2,s3,s4 = 3.
    // Authenticated: s3,s4 = 2.
    expect(funnel).toEqual([
      { key: "viewed", label: "Viewed", count: 4 },
      { key: "interacted", label: "Interacted", count: 3 },
      { key: "authenticated", label: "Authenticated", count: 2 },
    ]);
  });

  it("narrows to a prospect scope - out-of-scope sessions contribute nothing", async () => {
    const funnel = await funnelFixture().demoKindFunnel(
      ["d1", "d2", "d3"],
      new Set(["p1"]),
    );
    // p2's s4 (interacted + authenticated) drops out entirely.
    expect(funnel).toEqual([
      { key: "viewed", label: "Viewed", count: 3 },
      { key: "interacted", label: "Interacted", count: 2 },
      { key: "authenticated", label: "Authenticated", count: 1 },
    ]);
  });

  it("honors the range window", async () => {
    const funnel = await funnelFixture().demoKindFunnel(
      ["d1", "d2", "d3"],
      "all",
      "7d",
      new Date("2026-09-01T00:00:00Z"), // every fixture session is now stale
    );
    expect(funnel).toEqual([
      { key: "viewed", label: "Viewed", count: 0 },
      { key: "interacted", label: "Interacted", count: 0 },
      { key: "authenticated", label: "Authenticated", count: 0 },
    ]);
  });

  it("returns empty for an empty config-id set", async () => {
    expect(await funnelFixture().demoKindFunnel([], "all")).toEqual([]);
  });
});

describe("PostgresAnalyticsService.prospectTimeseries", () => {
  function fixture() {
    return new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-07-20T10:00:00Z"),
          lastSeenAt: new Date("2026-07-20T10:02:00Z"),
        }),
        session({
          id: "s2",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d2",
          startedAt: new Date("2026-07-20T14:00:00Z"),
          lastSeenAt: new Date("2026-07-20T14:02:00Z"),
        }),
        session({
          id: "s3",
          anonId: "a2",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-07-21T09:00:00Z"),
          lastSeenAt: new Date("2026-07-21T09:02:00Z"),
        }),
        // Internal self-view - excluded from every bucket.
        session({
          id: "s4",
          anonId: "a3",
          prospectId: "p1",
          demoConfigId: "d1",
          isInternal: true,
          startedAt: new Date("2026-07-21T10:00:00Z"),
        }),
        // A different prospect - never in p1's series.
        session({
          id: "s5",
          anonId: "a9",
          prospectId: "p2",
          demoConfigId: "d9",
          startedAt: new Date("2026-07-21T11:00:00Z"),
        }),
      ]),
    );
  }

  const NOW = new Date("2026-07-22T00:00:00Z");

  it("buckets one prospect's sessions by UTC day, sessions + unique viewers", async () => {
    const points = await fixture().prospectTimeseries("p1", "all", "all", NOW);
    const byDate = new Map(points.map((p) => [p.date, p]));
    expect(byDate.get("2026-07-20")).toEqual({
      date: "2026-07-20",
      sessions: 2,
      viewers: 1,
    });
    expect(byDate.get("2026-07-21")).toEqual({
      date: "2026-07-21",
      sessions: 1,
      viewers: 1,
    });
    expect(points.map((p) => p.date)).toEqual(["2026-07-20", "2026-07-21"]);
  });

  it("fills every day in a bounded window incl. zero days", async () => {
    const points = await fixture().prospectTimeseries("p1", "all", "7d", NOW);
    expect(points).toHaveLength(8); // 07-15..07-22 inclusive
    expect(points[0]!.date).toBe("2026-07-15");
    expect(points[points.length - 1]!.date).toBe("2026-07-22");
    expect(points.find((p) => p.date === "2026-07-16")).toEqual({
      date: "2026-07-16",
      sessions: 0,
      viewers: 0,
    });
  });

  it("returns empty when the prospect is out of scope", async () => {
    expect(
      await fixture().prospectTimeseries("p1", new Set(["p2"]), "all", NOW),
    ).toEqual([]);
  });

  it("never surfaces prospect identity in a point", async () => {
    const points = await fixture().prospectTimeseries("p1", "all", "all", NOW);
    for (const p of points) {
      expect(Object.keys(p).sort()).toEqual(["date", "sessions", "viewers"]);
    }
  });
});

describe("PostgresAnalyticsService.prospectFunnel", () => {
  // p1: s1 pageview-only (viewed, not interacted), s2 has a step (interacted),
  // s3 authenticated (interacted + authenticated). No "completed" milestone
  // anywhere - the funnel is 3 stages, never a fabricated Completed.
  function fixture() {
    return new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          events: [
            {
              type: "pageview",
              name: "view",
              props: null,
              ts: new Date("2026-07-20T10:00:00Z"),
            },
          ],
        }),
        session({
          id: "s2",
          anonId: "a2",
          prospectId: "p1",
          demoConfigId: "d1",
          events: [
            {
              type: "step",
              name: "select-asset",
              props: null,
              ts: new Date("2026-07-20T10:01:00Z"),
            },
          ],
        }),
        session({
          id: "s3",
          anonId: "a3",
          prospectId: "p1",
          demoConfigId: "d1",
          events: [
            {
              type: "milestone",
              name: "authenticated",
              props: { email: "jo@acme.com" },
              ts: new Date("2026-07-20T10:02:00Z"),
            },
          ],
        }),
        // Internal self-view - excluded from every stage.
        session({
          id: "s4",
          anonId: "a4",
          prospectId: "p1",
          demoConfigId: "d1",
          isInternal: true,
          events: [
            {
              type: "milestone",
              name: "authenticated",
              props: null,
              ts: new Date("2026-07-20T10:03:00Z"),
            },
          ],
        }),
      ]),
    );
  }

  it("derives 3 real stages from session/step/milestone signals", async () => {
    const funnel = await fixture().prospectFunnel("p1", "all");
    expect(funnel).toEqual([
      { key: "viewed", label: "Viewed", count: 3 },
      { key: "interacted", label: "Interacted", count: 2 },
      { key: "authenticated", label: "Authenticated", count: 1 },
    ]);
  });

  it("never emits a fabricated Completed stage when no completion signal exists", async () => {
    const funnel = await fixture().prospectFunnel("p1", "all");
    expect(funnel.map((s) => s.key)).not.toContain("completed");
    expect(funnel).toHaveLength(3);
  });

  it("appends a Completed stage only when a completed milestone exists", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          events: [
            {
              type: "milestone",
              name: "authenticated",
              props: null,
              ts: new Date("2026-07-20T10:00:00Z"),
            },
            {
              type: "milestone",
              name: "completed",
              props: null,
              ts: new Date("2026-07-20T10:05:00Z"),
            },
          ],
        }),
      ]),
    );
    const funnel = await svc.prospectFunnel("p1", "all");
    expect(funnel).toEqual([
      { key: "viewed", label: "Viewed", count: 1 },
      { key: "interacted", label: "Interacted", count: 1 },
      { key: "authenticated", label: "Authenticated", count: 1 },
      { key: "completed", label: "Completed", count: 1 },
    ]);
  });

  it("returns empty when the prospect is out of scope", async () => {
    expect(await fixture().prospectFunnel("p1", new Set(["p2"]))).toEqual([]);
  });

  it("honors the range window when narrowing the funnel", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-05-01T10:00:00Z"), // stale for a 7d window
          events: [
            {
              type: "step",
              name: "x",
              props: null,
              ts: new Date("2026-05-01T10:01:00Z"),
            },
          ],
        }),
      ]),
    );
    const funnel = await svc.prospectFunnel(
      "p1",
      "all",
      "7d",
      new Date("2026-07-22T00:00:00Z"),
    );
    expect(funnel).toEqual([
      { key: "viewed", label: "Viewed", count: 0 },
      { key: "interacted", label: "Interacted", count: 0 },
      { key: "authenticated", label: "Authenticated", count: 0 },
    ]);
  });
});

describe("PostgresAnalyticsService org roll-ups", () => {
  // p1 (d1 wallet, d2 earn), p2 (d3 wallet). p2 out of a scoped viewer's view.
  function fixture() {
    return new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d1",
          demoSlug: "wallet",
          startedAt: new Date("2026-07-20T10:00:00Z"),
          events: [
            { type: "step", name: "x", props: null, ts: new Date("2026-07-20T10:01:00Z") },
          ],
        }),
        session({
          id: "s2",
          anonId: "a1",
          prospectId: "p1",
          demoConfigId: "d2",
          demoSlug: "earn",
          startedAt: new Date("2026-07-21T10:00:00Z"),
          events: [
            {
              type: "milestone",
              name: "authenticated",
              props: null,
              ts: new Date("2026-07-21T10:01:00Z"),
            },
          ],
        }),
        session({
          id: "s3",
          anonId: "a2",
          prospectId: "p2",
          demoConfigId: "d3",
          demoSlug: "wallet",
          startedAt: new Date("2026-07-21T12:00:00Z"),
          events: [],
        }),
        // Internal self-view - excluded from every roll-up.
        session({
          id: "s4",
          anonId: "a3",
          prospectId: "p2",
          demoConfigId: "d3",
          demoSlug: "wallet",
          isInternal: true,
          startedAt: new Date("2026-07-21T13:00:00Z"),
        }),
        // Unattributed session (no share link) - never in any prospect scope.
        session({
          id: "s5",
          anonId: "a4",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-07-21T14:00:00Z"),
          shareLink: null,
        }),
      ]),
    );
  }

  const KIND_MAP = new Map<
    string,
    "earn" | "wallet" | "trade" | "visa-direct" | "checkout" | "remittance"
  >([
    ["d1", "wallet"],
    ["d2", "earn"],
    ["d3", "wallet"],
  ]);

  const NOW = new Date("2026-07-22T00:00:00Z");

  it("orgTimeseries spans every demo across all in-scope prospects", async () => {
    const points = await fixture().orgTimeseries("all", "all", NOW);
    const byDate = new Map(points.map((p) => [p.date, p]));
    // 07-20: s1 only. 07-21: s2 (p1) + s3 (p2); s4 internal, s5 unattributed.
    expect(byDate.get("2026-07-20")).toEqual({
      date: "2026-07-20",
      sessions: 1,
      viewers: 1,
    });
    expect(byDate.get("2026-07-21")).toEqual({
      date: "2026-07-21",
      sessions: 2,
      viewers: 2,
    });
  });

  it("orgTimeseries narrows to a prospect scope without leaking the rest", async () => {
    const points = await fixture().orgTimeseries(new Set(["p1"]), "all", NOW);
    const byDate = new Map(points.map((p) => [p.date, p]));
    expect(byDate.get("2026-07-21")).toEqual({
      date: "2026-07-21",
      sessions: 1, // p2's s3 dropped
      viewers: 1,
    });
  });

  it("orgTimeseries returns an empty scope as all-zero buckets, never a leak", async () => {
    const points = await fixture().orgTimeseries(new Set<string>(), "all", NOW);
    expect(points.every((p) => p.sessions === 0 && p.viewers === 0)).toBe(true);
  });

  it("orgFunnel derives real stages across every demo, counts only", async () => {
    const funnel = await fixture().orgFunnel("all");
    // Viewed: s1,s2,s3 (3). Interacted: s1(step), s2(milestone) = 2.
    // Authenticated: s2 = 1. No completed milestone -> 3 stages.
    expect(funnel).toEqual([
      { key: "viewed", label: "Viewed", count: 3 },
      { key: "interacted", label: "Interacted", count: 2 },
      { key: "authenticated", label: "Authenticated", count: 1 },
    ]);
  });

  it("orgFunnel narrows to a prospect scope", async () => {
    const funnel = await fixture().orgFunnel(new Set(["p1"]));
    expect(funnel).toEqual([
      { key: "viewed", label: "Viewed", count: 2 },
      { key: "interacted", label: "Interacted", count: 2 },
      { key: "authenticated", label: "Authenticated", count: 1 },
    ]);
  });

  it("orgDemoKindBreakdown groups sessions + viewers by kind across all demos", async () => {
    const rows = await fixture().orgDemoKindBreakdown(KIND_MAP, "all", "all", NOW);
    const byKind = new Map(rows.map((r) => [r.kind, r]));
    // wallet: s1 (d1) + s3 (d3) = 2 sessions, viewers a1 + a2 = 2.
    expect(byKind.get("wallet")).toEqual({ kind: "wallet", sessions: 2, viewers: 2 });
    // earn: s2 (d2) = 1 session, viewer a1.
    expect(byKind.get("earn")).toEqual({ kind: "earn", sessions: 1, viewers: 1 });
    // Spans multiple kinds.
    expect(rows.map((r) => r.kind).sort()).toEqual(["earn", "wallet"]);
  });

  it("orgDemoKindBreakdown scope narrows and never leaks out-of-scope kinds", async () => {
    const rows = await fixture().orgDemoKindBreakdown(
      KIND_MAP,
      new Set(["p1"]),
      "all",
      NOW,
    );
    const byKind = new Map(rows.map((r) => [r.kind, r]));
    // Only p1's d1 (wallet) + d2 (earn); p2's d3 wallet session drops out.
    expect(byKind.get("wallet")).toEqual({ kind: "wallet", sessions: 1, viewers: 1 });
    expect(byKind.get("earn")).toEqual({ kind: "earn", sessions: 1, viewers: 1 });
  });

  it("orgDemoKindBreakdown zero-fills a kind present in the map but with no sessions", async () => {
    const mapWithTrade = new Map(KIND_MAP);
    mapWithTrade.set("d99", "trade");
    const rows = await fixture().orgDemoKindBreakdown(mapWithTrade, "all", "all", NOW);
    const byKind = new Map(rows.map((r) => [r.kind, r]));
    expect(byKind.get("trade")).toEqual({ kind: "trade", sessions: 0, viewers: 0 });
  });
});

describe("PostgresAnalyticsService.listAllContacts (org-wide, active-scope Contacts view)", () => {
  // 5 distinct contacts (anonId doubles as key - none authenticate) across
  // 3 prospects; "c1" touches both p1 and p2, so grouping must span prospects
  // exactly like listProspectContacts does for one.
  function fixture() {
    return new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "c1",
          prospectId: "p1",
          demoConfigId: "d1",
          lastSeenAt: new Date("2026-07-15T10:00:00Z"),
        }),
        session({
          id: "s2",
          anonId: "c2",
          prospectId: "p1",
          demoConfigId: "d1",
          lastSeenAt: new Date("2026-07-16T10:00:00Z"),
        }),
        session({
          id: "s3",
          anonId: "c3",
          prospectId: "p2",
          demoConfigId: "d2",
          lastSeenAt: new Date("2026-07-17T10:00:00Z"),
        }),
        session({
          id: "s4",
          anonId: "c4",
          prospectId: "p2",
          demoConfigId: "d2",
          lastSeenAt: new Date("2026-07-18T10:00:00Z"),
        }),
        session({
          id: "s5",
          anonId: "c5",
          prospectId: "p3",
          demoConfigId: "d3",
          lastSeenAt: new Date("2026-07-19T10:00:00Z"),
        }),
        // Same contact as s1 (anonId c1), a later visit on a different
        // prospect - must merge into the same contact and widen prospectIds.
        session({
          id: "s6",
          anonId: "c1",
          prospectId: "p2",
          demoConfigId: "d2",
          lastSeenAt: new Date("2026-07-20T10:00:00Z"),
        }),
      ]),
    );
  }

  it("groups across every prospect in scope, same aggregate shape as listProspectContacts", async () => {
    const page = await fixture().listAllContacts("all");
    expect(page.items).toHaveLength(5);
    const c1 = page.items.find((c) => c.key === "c1")!;
    expect(c1.sessionCount).toBe(2);
    expect(c1.prospectIds).toEqual(["p1", "p2"]);
    expect(c1.lastSeenAt).toBe("2026-07-20T10:00:00.000Z");
  });

  it("orders newest lastSeenAt first, ties broken by id", async () => {
    const page = await fixture().listAllContacts("all");
    expect(page.items.map((c) => c.key)).toEqual(["c1", "c5", "c4", "c3", "c2"]);
  });

  it("defaults to DEFAULT_PAGE_LIMIT and returns null nextCursor when everything fits", async () => {
    const page = await fixture().listAllContacts("all");
    expect(page.items).toHaveLength(5);
    expect(page.nextCursor).toBeNull();
  });

  it("clamps an out-of-range limit up to 1 and still reports a next page", async () => {
    const page = await fixture().listAllContacts("all", { limit: 0 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]!.key).toBe("c1");
    expect(page.nextCursor).not.toBeNull();
  });

  it("sets nextCursor on a full page and walks to a final null-cursor partial page", async () => {
    const svc = fixture();
    const page1 = await svc.listAllContacts("all", { limit: 2 });
    expect(page1.items.map((c) => c.key)).toEqual(["c1", "c5"]);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await svc.listAllContacts("all", {
      limit: 2,
      cursor: page1.nextCursor,
    });
    expect(page2.items.map((c) => c.key)).toEqual(["c4", "c3"]);
    expect(page2.nextCursor).not.toBeNull();

    const page3 = await svc.listAllContacts("all", {
      limit: 2,
      cursor: page2.nextCursor,
    });
    expect(page3.items.map((c) => c.key)).toEqual(["c2"]);
    expect(page3.nextCursor).toBeNull();
  });

  it("returns an empty page for an unknown/stale cursor rather than restarting from the top", async () => {
    const page = await fixture().listAllContacts("all", {
      cursor: Buffer.from("nonexistent-id", "utf8").toString("base64url"),
    });
    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it("a concrete prospect-id scope excludes out-of-scope contacts and sessions entirely", async () => {
    const page = await fixture().listAllContacts(new Set(["p1"]));
    // p1 only has c1 (s1) and c2 (s2); c1's s6 (p2) must not count or appear.
    expect(page.items.map((c) => c.key).sort()).toEqual(["c1", "c2"]);
    const c1 = page.items.find((c) => c.key === "c1")!;
    expect(c1.sessionCount).toBe(1);
    expect(c1.prospectIds).toEqual(["p1"]);
  });

  it("a team scope (its prospect-id set) excludes every contact outside that team's prospects", async () => {
    // Simulates the "team" active-scope cell: the resolved id set is just
    // that team's prospects (p2, p3 here).
    const page = await fixture().listAllContacts(new Set(["p2", "p3"]));
    expect(page.items.map((c) => c.key).sort()).toEqual(["c1", "c3", "c4", "c5"]);
    expect(page.items.some((c) => c.key === "c2")).toBe(false);
  });

  it("an empty scope (no visible/owned prospects) excludes everything", async () => {
    const page = await fixture().listAllContacts(new Set<string>());
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("'all' (admin) never narrows - every prospect's contacts appear", async () => {
    const page = await fixture().listAllContacts("all");
    expect(page.items.map((c) => c.key).sort()).toEqual(
      ["c1", "c2", "c3", "c4", "c5"].sort(),
    );
  });
});

describe("PostgresAnalyticsService.listAllContactSessions (org-wide)", () => {
  it("returns a contact's sessions across every prospect in scope, newest first", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({
          id: "s1",
          anonId: "c1",
          prospectId: "p1",
          demoConfigId: "d1",
          startedAt: new Date("2026-07-18T10:00:00Z"),
          lastSeenAt: new Date("2026-07-18T10:05:00Z"),
        }),
        session({
          id: "s2",
          anonId: "c1",
          prospectId: "p2",
          demoConfigId: "d2",
          startedAt: new Date("2026-07-20T09:00:00Z"),
          lastSeenAt: new Date("2026-07-20T09:10:00Z"),
        }),
        // A different contact on one of the same prospects - must never leak in.
        session({ id: "s3", anonId: "c9", prospectId: "p1", demoConfigId: "d1" }),
      ]),
    );
    const sessions = await svc.listAllContactSessions("c1", "all");
    expect(sessions.map((s) => s.id)).toEqual(["s2", "s1"]);
  });

  it("narrows to scope, dropping sessions on out-of-scope prospects", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([
        session({ id: "s1", anonId: "c1", prospectId: "p1", demoConfigId: "d1" }),
        session({ id: "s2", anonId: "c1", prospectId: "p2", demoConfigId: "d2" }),
      ]),
    );
    const sessions = await svc.listAllContactSessions("c1", new Set(["p1"]));
    expect(sessions.map((s) => s.id)).toEqual(["s1"]);
  });

  it("returns empty for a contact key with no sessions in scope", async () => {
    const svc = new PostgresAnalyticsService(
      fakePrisma([session({ id: "s1", anonId: "c1", prospectId: "p1", demoConfigId: "d1" })]),
    );
    expect(await svc.listAllContactSessions("nobody", "all")).toEqual([]);
  });
});
