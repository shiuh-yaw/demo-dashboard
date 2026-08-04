/**
 * Postgres-backed analytics READ layer (Prisma + Supabase via
 * @dynamic-demos/db). Read-only: no writes, no connection of its own - it
 * leans on the `prisma` singleton (D-013), and only apps/dashboard imports
 * @dynamic-demos/db (D-015).
 *
 * Sessions carry no prospectId/demoConfigId of their own - they attach to a
 * prospect + demo only through their `shareLink`, so every read joins
 * `VisitorSession -> ShareLink`. Internal self-views (`isInternal`) are
 * excluded everywhere. Aggregation runs in JS over one `findMany` per call:
 * demo-scale volumes make this simpler and more testable than relation
 * groupBy, and keeps the injectable client tiny.
 *
 * PII boundary (Phase 10): raw IPs never leave the service. Only enrichment
 * company and captured identity (email/dynamicUserId from the wallet-pilot
 * `authenticated` milestone) are surfaced.
 */

import { prisma as defaultPrisma } from "@dynamic-demos/db";
import {
  isProspectInReadScope,
  type AnalyticsReadScope,
  type AnalyticsService,
  type AnalyticsTimeRange,
  type CatalogFunnel,
  type CatalogDemoTimeseriesPoint,
  type ContactCompany,
  type ContactView,
  type DemoConfigKind,
  type DemoKindTimeseriesPoint,
  type DemoSummary,
  type FunnelStage,
  type OrgContactView,
  type OrgDemoKindBreakdownRow,
  type OverviewEngagement,
  type Page,
  type PageOptions,
  type ProspectSummary,
  type VisitorSessionView,
} from "../types";
import { clampLimit, decodeCursor, toPage } from "./pagination";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Range -> lookback window in days; `null` means no lower bound ("all"). */
const RANGE_DAYS: Record<AnalyticsTimeRange, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

/** UTC calendar-day key, e.g. "2026-07-20". */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Milestone event that carries person-level identity for enrichment. */
const IDENTITY_MILESTONE = "authenticated";

/** Row shape the service reads; a subset of `VisitorSession` + relations. */
export interface AnalyticsSessionRow {
  id: string;
  anonId: string;
  demoSlug: string;
  startedAt: Date;
  lastSeenAt: Date;
  isInternal: boolean;
  enrichment: unknown | null;
  /**
   * Session-level identity persisted server-side by
   * `PostgresVisitorSessionService.upsertFromBatch` (SP2) via `identify()`.
   * Additive alongside the milestone-derived `email`/`dynamicUserId` below -
   * a later sub-project can switch reads to prefer these columns.
   */
  identifiedUserId?: string | null;
  identifiedEmail?: string | null;
  shareLink: { prospectId: string; demoConfigId: string } | null;
  events: Array<{
    type: string;
    name: string;
    props: Record<string, unknown> | null;
    ts: Date;
  }>;
}

/** Relation-aware filter; mirrors the Prisma `VisitorSession` where subset. */
export interface AnalyticsSessionWhere {
  isInternal?: boolean;
  demoSlug?: string;
  startedAt?: { gte?: Date };
  /** `{ not: null }` for the prospect join; `null` for catalog's no-share-link read. */
  shareLinkId?: { not: null } | null;
  shareLink?: {
    prospectId?: string | { in: string[] };
    demoConfigId?: string | { in: string[] };
  };
  events?: {
    some: {
      type?: string | { in: readonly string[] };
      name?: string;
    };
  };
}

/**
 * Minimal slice of the Prisma client this service depends on. The real
 * `PrismaClient` structurally satisfies it; unit tests inject an in-memory
 * fake. `include` is honored by the real client to hydrate `shareLink` /
 * `events`; the fake returns rows already carrying both. `count` runs the
 * same filter without hydrating rows, for aggregate-only reads.
 */
export interface AnalyticsPrismaClient {
  visitorSession: {
    findMany(args: {
      where: AnalyticsSessionWhere;
      include?: { shareLink?: boolean; events?: boolean };
    }): Promise<AnalyticsSessionRow[]>;
    count(args: { where: AnalyticsSessionWhere }): Promise<number>;
  };
}

const INCLUDE = { shareLink: true, events: true } as const;

/** Zeroed prospect summary - the shape callers get for no-data ids. */
function emptyProspectSummary(): ProspectSummary {
  return { sessions: 0, viewers: 0, avgDurationSec: 0, lastViewedAt: null };
}

function toIso(d: Date): string {
  return d.toISOString();
}

function maxIso(rows: AnalyticsSessionRow[]): string | null {
  let max = 0;
  for (const r of rows) max = Math.max(max, r.lastSeenAt.getTime());
  return max > 0 ? new Date(max).toISOString() : null;
}

function uniqueViewers(rows: AnalyticsSessionRow[]): number {
  return new Set(rows.map((r) => r.anonId)).size;
}

function avgDurationSec(rows: AnalyticsSessionRow[]): number {
  if (rows.length === 0) return 0;
  let total = 0;
  for (const r of rows) {
    total += Math.max(0, r.lastSeenAt.getTime() - r.startedAt.getTime());
  }
  return Math.round(total / rows.length / 1000);
}

/** Sessions started on/after the range cutoff; "all" (null cutoff) keeps all. */
function withinRange(
  rows: AnalyticsSessionRow[],
  range: AnalyticsTimeRange,
  now: Date,
): AnalyticsSessionRow[] {
  const days = RANGE_DAYS[range];
  if (days == null) return rows;
  const cutoff = now.getTime() - days * DAY_MS;
  return rows.filter((r) => r.startedAt.getTime() >= cutoff);
}

/**
 * Org-scope Prisma where clause: every non-internal, share-link-attributed
 * session whose prospect is in `scope`, bounded to `range` when given. Pushes
 * the Tier-1 prospect gate and the range cutoff into SQL instead of pulling
 * every org session into JS - "all" only requires a share link to exist; a
 * concrete scope also matches its prospect ids (empty scope matches nothing).
 */
function orgScopeWhere(
  scope: AnalyticsReadScope,
  range: AnalyticsTimeRange = "all",
  now: Date = new Date(),
): AnalyticsSessionWhere {
  const where: AnalyticsSessionWhere = {
    isInternal: false,
    ...(scope === "all"
      ? { shareLinkId: { not: null } }
      : { shareLink: { prospectId: { in: [...scope] } } }),
  };
  const days = RANGE_DAYS[range];
  if (days != null) where.startedAt = { gte: new Date(now.getTime() - days * DAY_MS) };
  return where;
}

/**
 * Buckets scoped rows into one point per UTC day (sessions + unique viewers).
 * Bounded ranges fill every day in the window incl. zero-activity days so the
 * chart x-axis is a continuous span; "all" only emits days that had activity.
 */
function buildTimeseries(
  rows: AnalyticsSessionRow[],
  range: AnalyticsTimeRange,
  now: Date,
): DemoKindTimeseriesPoint[] {
  const days = RANGE_DAYS[range];
  const cutoff = days == null ? null : new Date(now.getTime() - days * DAY_MS);
  const inRange = cutoff
    ? rows.filter((r) => r.startedAt.getTime() >= cutoff.getTime())
    : rows;

  const buckets = new Map<string, { sessions: number; viewers: Set<string> }>();
  for (const r of inRange) {
    const key = dayKey(r.startedAt);
    const bucket = buckets.get(key) ?? { sessions: 0, viewers: new Set<string>() };
    bucket.sessions += 1;
    bucket.viewers.add(r.anonId);
    buckets.set(key, bucket);
  }
  if (cutoff) {
    for (let t = cutoff.getTime(); t <= now.getTime(); t += DAY_MS) {
      const key = dayKey(new Date(t));
      if (!buckets.has(key)) buckets.set(key, { sessions: 0, viewers: new Set() });
    }
  }

  return Array.from(buckets.entries())
    .map(([date, b]) => ({ date, sessions: b.sessions, viewers: b.viewers.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** True when the session did anything beyond loading (a step or any milestone). */
function isInteracted(row: AnalyticsSessionRow): boolean {
  return row.events.some((e) => e.type === "step" || e.type === "milestone");
}

/** True when the session carries a milestone of the given name. */
function hasMilestone(row: AnalyticsSessionRow, name: string): boolean {
  return row.events.some((e) => e.type === "milestone" && e.name === name);
}

const COMPLETED_MILESTONE = "completed";

/** `VisitorSession.demoSlug` value for the catalog front door itself. */
const CATALOG_SLUG = "catalog";

/** Event name a catalog session emits when the visitor launches a demo. */
const DEMO_LAUNCH_EVENT = "demo_launch";

/** Catalog's own where clause: non-internal, no share link, demoSlug=catalog.
 * Never joins `shareLink` - isolated from every prospect/share-link read in
 * this file, which all key off `shareLinkId not null` instead. */
const CATALOG_WHERE: AnalyticsSessionWhere = {
  demoSlug: CATALOG_SLUG,
  shareLinkId: null,
  isInternal: false,
};

/**
 * Engagement funnel from REAL signals only: Viewed (session exists) ->
 * Interacted (a step or any milestone) -> Authenticated (the `authenticated`
 * milestone). The Completed stage is appended only when a "completed"
 * milestone actually appears in these rows - never fabricated as always-zero.
 */
function buildFunnel(rows: AnalyticsSessionRow[]): FunnelStage[] {
  let interacted = 0;
  let authenticated = 0;
  let completed = 0;
  let sawCompleted = false;
  for (const r of rows) {
    if (isInteracted(r)) interacted += 1;
    if (hasMilestone(r, IDENTITY_MILESTONE)) authenticated += 1;
    if (hasMilestone(r, COMPLETED_MILESTONE)) {
      completed += 1;
      sawCompleted = true;
    }
  }
  const stages: FunnelStage[] = [
    { key: "viewed", label: "Viewed", count: rows.length },
    { key: "interacted", label: "Interacted", count: interacted },
    { key: "authenticated", label: "Authenticated", count: authenticated },
  ];
  if (sawCompleted) {
    stages.push({ key: "completed", label: "Completed", count: completed });
  }
  return stages;
}

/**
 * Groups a catalog session's `demo_launch` events by the demo slug they
 * launched, sorted by launches desc. `props.demo` is opaque Json - guarded
 * to a string, anything else (missing, number, object) is silently dropped
 * rather than counted or thrown on.
 */
function buildCatalogByDemo(
  rows: AnalyticsSessionRow[],
  uniqueVisitors: number,
): CatalogFunnel["byDemo"] {
  const launches = new Map<string, number>();
  for (const row of rows) {
    for (const ev of row.events) {
      if (ev.name !== DEMO_LAUNCH_EVENT) continue;
      const demo = ev.props?.demo;
      if (typeof demo !== "string") continue;
      launches.set(demo, (launches.get(demo) ?? 0) + 1);
    }
  }
  return Array.from(launches.entries())
    .map(([slug, count]) => ({
      slug,
      launches: count,
      launchRate: uniqueVisitors ? count / uniqueVisitors : 0,
    }))
    .sort((a, b) => b.launches - a.launches);
}

/**
 * Daily launch trend for one catalog demo: counts `demo_launch` events whose
 * `props.demo` strictly equals `slug`, bucketed by the event's own UTC day
 * (not the session start), and zero-filled across bounded ranges so the chart
 * axis stays continuous - mirrors `buildTimeseries`. Strict `=== slug` drops
 * non-string `props.demo` for free. Internal sessions are already excluded by
 * `CATALOG_WHERE` upstream.
 */
function buildCatalogDemoTimeseries(
  rows: AnalyticsSessionRow[],
  slug: string,
  range: AnalyticsTimeRange,
  now: Date,
): CatalogDemoTimeseriesPoint[] {
  const days = RANGE_DAYS[range];
  const cutoff = days == null ? null : new Date(now.getTime() - days * DAY_MS);

  const buckets = new Map<string, number>();
  for (const row of rows) {
    for (const ev of row.events) {
      if (ev.name !== DEMO_LAUNCH_EVENT) continue;
      if (ev.props?.demo !== slug) continue;
      if (cutoff && ev.ts.getTime() < cutoff.getTime()) continue;
      const key = dayKey(ev.ts);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }
  if (cutoff) {
    for (let t = cutoff.getTime(); t <= now.getTime(); t += DAY_MS) {
      const key = dayKey(new Date(t));
      if (!buckets.has(key)) buckets.set(key, 0);
    }
  }

  return Array.from(buckets.entries())
    .map(([date, launches]) => ({ date, launches }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Defensive enrichment reader. Phase 10 writes `enrichment` as opaque Json;
 * this tolerates several plausible shapes (`{ company: { name, domain } }`,
 * `{ company: "Acme" }`, `{ companyName, companyDomain }`, ipinfo `{ org }`)
 * and returns null when nothing company-like is present. Raw IP / geo are
 * never read here.
 */
function readCompany(enrichment: unknown): ContactCompany | null {
  if (!enrichment || typeof enrichment !== "object") return null;
  const e = enrichment as Record<string, unknown>;
  let name: string | null = null;
  let domain: string | null = null;

  const c = e.company;
  if (typeof c === "string") {
    name = c;
  } else if (c && typeof c === "object") {
    const co = c as Record<string, unknown>;
    if (typeof co.name === "string") name = co.name;
    if (typeof co.domain === "string") domain = co.domain;
  }
  if (!name && typeof e.companyName === "string") name = e.companyName;
  if (!domain && typeof e.companyDomain === "string") domain = e.companyDomain;
  if (!name && typeof e.org === "string") name = e.org;

  if (!name && !domain) return null;
  return { name: name ?? null, domain: domain ?? null };
}

/** Pull captured identity from the `authenticated` milestone props. */
function readIdentity(row: AnalyticsSessionRow): {
  email: string | null;
  dynamicUserId: string | null;
} {
  for (const ev of row.events) {
    if (ev.type !== "milestone" || ev.name !== IDENTITY_MILESTONE) continue;
    const props = ev.props ?? {};
    const email = typeof props.email === "string" ? props.email : null;
    const dynamicUserId =
      typeof props.dynamicUserId === "string" ? props.dynamicUserId : null;
    if (email || dynamicUserId) return { email, dynamicUserId };
  }
  return { email: null, dynamicUserId: null };
}

/** Milestone names in first-seen order (deduped). */
function readMilestones(row: AnalyticsSessionRow): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ev of [...row.events].sort(
    (a, b) => a.ts.getTime() - b.ts.getTime(),
  )) {
    if (ev.type !== "milestone" || seen.has(ev.name)) continue;
    seen.add(ev.name);
    out.push(ev.name);
  }
  return out;
}

function toSessionView(row: AnalyticsSessionRow): VisitorSessionView {
  const identity = readIdentity(row);
  return {
    id: row.id,
    demoConfigId: row.shareLink?.demoConfigId ?? null,
    demoSlug: row.demoSlug,
    anonId: row.anonId,
    startedAt: toIso(row.startedAt),
    lastSeenAt: toIso(row.lastSeenAt),
    company: readCompany(row.enrichment),
    email: identity.email,
    dynamicUserId: identity.dynamicUserId,
    milestones: readMilestones(row),
    identifiedUserId: row.identifiedUserId ?? null,
    identifiedEmail: row.identifiedEmail ?? null,
  };
}

/**
 * Groups session views into one entry per contact identity. Sessions from the
 * same `anonId` merge first (one browser/visit); anon-groups that resolved a
 * captured email then merge again by that email - two different anonIds
 * authenticating with the same email are one person, not two contacts.
 * Generic over any `VisitorSessionView`-shaped row so both the single-prospect
 * (`listProspectContacts`) and org-wide (`listAllContacts`) callers share the
 * exact same grouping - the latter passes rows carrying an extra
 * `prospectId` field (see `ScopedSessionView` below).
 */
function groupSessionsByContact<T extends VisitorSessionView>(
  views: T[],
): Map<string, T[]> {
  const byAnon = new Map<string, T[]>();
  for (const v of views) {
    (byAnon.get(v.anonId) ?? byAnon.set(v.anonId, []).get(v.anonId)!).push(v);
  }

  const byContact = new Map<string, T[]>();
  for (const group of byAnon.values()) {
    const email = group.map((v) => v.email).find(Boolean) ?? null;
    const key = email ?? group[0]!.anonId;
    const existing = byContact.get(key);
    if (existing) existing.push(...group);
    else byContact.set(key, [...group]);
  }
  return byContact;
}

/**
 * Aggregate fields shared by `ContactView` and `OrgContactView` - the single
 * grouping-to-view projection both `listProspectContacts` and
 * `listAllContacts` build on, so the aggregate math (first/last seen, demo
 * slugs, session count) never diverges between the per-prospect and
 * org-wide contacts views.
 */
function contactViewFromGroup(
  key: string,
  group: VisitorSessionView[],
): ContactView {
  const email = group.map((v) => v.email).find(Boolean) ?? null;
  const company = group.map((v) => v.company).find(Boolean) ?? null;
  const firstSeenAt = group
    .map((v) => v.startedAt)
    .reduce((min, s) => (s < min ? s : min));
  const lastSeenAt = group
    .map((v) => v.lastSeenAt)
    .reduce((max, s) => (s > max ? s : max));
  const demoSlugs = Array.from(new Set(group.map((v) => v.demoSlug))).sort();
  return { key, email, company, firstSeenAt, lastSeenAt, sessionCount: group.length, demoSlugs };
}

/** `VisitorSessionView` plus the prospect it belongs to - only the org-wide
 * (cross-prospect) contacts reads need this; per-prospect reads already know
 * the prospect from their input. */
interface ScopedSessionView extends VisitorSessionView {
  prospectId: string;
}

export class PostgresAnalyticsService implements AnalyticsService {
  private readonly client: AnalyticsPrismaClient;

  constructor(client?: AnalyticsPrismaClient) {
    this.client =
      client ?? (defaultPrisma as unknown as AnalyticsPrismaClient);
  }

  private findByProspect(
    prospectId: string,
    demoConfigId?: string,
  ): Promise<AnalyticsSessionRow[]> {
    return this.client.visitorSession.findMany({
      where: {
        isInternal: false,
        shareLink: { prospectId, ...(demoConfigId ? { demoConfigId } : {}) },
      },
      include: INCLUDE,
    });
  }

  async demoSummary(demoConfigId: string): Promise<DemoSummary> {
    const rows = await this.client.visitorSession.findMany({
      where: { isInternal: false, shareLink: { demoConfigId } },
      include: INCLUDE,
    });
    return {
      sessions: rows.length,
      viewers: uniqueViewers(rows),
      avgDurationSec: avgDurationSec(rows),
      lastViewedAt: maxIso(rows),
    };
  }

  async demoKindSummary(
    demoConfigIds: readonly string[],
    scope: AnalyticsReadScope,
  ): Promise<DemoSummary> {
    if (demoConfigIds.length === 0) {
      return { sessions: 0, viewers: 0, avgDurationSec: 0, lastViewedAt: null };
    }
    const rows = await this.client.visitorSession.findMany({
      where: {
        isInternal: false,
        shareLink: { demoConfigId: { in: [...demoConfigIds] } },
      },
      include: INCLUDE,
    });
    // Tier-1 stays counts-only; `scope` narrows by prospect (My/Team filter)
    // without ever surfacing which prospect a session belongs to.
    const scoped = rows.filter(
      (r) =>
        r.shareLink != null &&
        isProspectInReadScope(scope, r.shareLink.prospectId),
    );
    return {
      sessions: scoped.length,
      viewers: uniqueViewers(scoped),
      avgDurationSec: avgDurationSec(scoped),
      lastViewedAt: maxIso(scoped),
    };
  }

  async demoKindTimeseries(
    demoConfigIds: readonly string[],
    scope: AnalyticsReadScope,
    range: AnalyticsTimeRange,
    now: Date = new Date(),
  ): Promise<DemoKindTimeseriesPoint[]> {
    if (demoConfigIds.length === 0) return [];
    const rows = await this.client.visitorSession.findMany({
      where: {
        isInternal: false,
        shareLink: { demoConfigId: { in: [...demoConfigIds] } },
      },
      include: INCLUDE,
    });
    // Same Tier-1 scoping as demoKindSummary: narrow by prospect, never by
    // identity.
    const scoped = rows.filter(
      (r) =>
        r.shareLink != null &&
        isProspectInReadScope(scope, r.shareLink.prospectId),
    );
    return buildTimeseries(scoped, range, now);
  }

  async demoKindFunnel(
    demoConfigIds: readonly string[],
    scope: AnalyticsReadScope,
    range: AnalyticsTimeRange = "all",
    now: Date = new Date(),
  ): Promise<FunnelStage[]> {
    if (demoConfigIds.length === 0) return [];
    const rows = await this.client.visitorSession.findMany({
      where: {
        isInternal: false,
        shareLink: { demoConfigId: { in: [...demoConfigIds] } },
      },
      include: INCLUDE,
    });
    // Same Tier-1 scoping as demoKindTimeseries: narrow by prospect, never by
    // identity; out-of-scope sessions contribute nothing.
    const scoped = rows.filter(
      (r) =>
        r.shareLink != null &&
        isProspectInReadScope(scope, r.shareLink.prospectId),
    );
    return buildFunnel(withinRange(scoped, range, now));
  }

  async prospectSummary(prospectId: string): Promise<ProspectSummary> {
    const rows = await this.findByProspect(prospectId);
    return {
      sessions: rows.length,
      viewers: uniqueViewers(rows),
      avgDurationSec: avgDurationSec(rows),
      lastViewedAt: maxIso(rows),
    };
  }

  async prospectSummaries(
    prospectIds: string[],
  ): Promise<Map<string, ProspectSummary>> {
    const out = new Map<string, ProspectSummary>();
    for (const id of prospectIds) out.set(id, emptyProspectSummary());
    if (prospectIds.length === 0) return out;

    const rows = await this.client.visitorSession.findMany({
      where: { isInternal: false, shareLink: { prospectId: { in: prospectIds } } },
      include: INCLUDE,
    });

    const grouped = new Map<string, AnalyticsSessionRow[]>();
    for (const r of rows) {
      const pid = r.shareLink?.prospectId;
      if (!pid) continue;
      (grouped.get(pid) ?? grouped.set(pid, []).get(pid)!).push(r);
    }
    for (const [pid, group] of grouped) {
      out.set(pid, {
        sessions: group.length,
        viewers: uniqueViewers(group),
        avgDurationSec: avgDurationSec(group),
        lastViewedAt: maxIso(group),
      });
    }
    return out;
  }

  async overviewEngagement(
    prospectIds: string[],
    now: Date = new Date(),
  ): Promise<OverviewEngagement> {
    if (prospectIds.length === 0) {
      return { sessions: 0, viewers: 0, activeThisWeek: 0 };
    }
    // Lean read for the overview cards: hydrate only `shareLink` (never
    // `events`), so this scales with session rows, not their event fan-out.
    const rows = await this.client.visitorSession.findMany({
      where: { isInternal: false, shareLink: { prospectId: { in: prospectIds } } },
      include: { shareLink: true },
    });
    const weekCutoff = now.getTime() - 7 * DAY_MS;
    const viewers = new Set<string>();
    const activeProspects = new Set<string>();
    for (const r of rows) {
      viewers.add(r.anonId);
      if (r.shareLink && r.lastSeenAt.getTime() >= weekCutoff) {
        activeProspects.add(r.shareLink.prospectId);
      }
    }
    return {
      sessions: rows.length,
      viewers: viewers.size,
      activeThisWeek: activeProspects.size,
    };
  }

  async listProspectSessions(
    prospectId: string,
    scope: AnalyticsReadScope,
    opts?: { demoConfigId?: string },
  ): Promise<VisitorSessionView[]> {
    if (!isProspectInReadScope(scope, prospectId)) return [];
    const rows = await this.findByProspect(prospectId, opts?.demoConfigId);
    return rows
      .map(toSessionView)
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  async listProspectContacts(
    prospectId: string,
    scope: AnalyticsReadScope,
  ): Promise<ContactView[]> {
    if (!isProspectInReadScope(scope, prospectId)) return [];
    const views = (await this.findByProspect(prospectId)).map(toSessionView);
    const byContact = groupSessionsByContact(views);
    const contacts = Array.from(byContact.entries()).map(([key, group]) =>
      contactViewFromGroup(key, group),
    );
    return contacts.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  async listContactSessions(
    prospectId: string,
    contactKey: string,
    scope: AnalyticsReadScope,
  ): Promise<VisitorSessionView[]> {
    if (!isProspectInReadScope(scope, prospectId)) return [];
    const views = (await this.findByProspect(prospectId)).map(toSessionView);
    const group = groupSessionsByContact(views).get(contactKey) ?? [];
    return [...group].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  /**
   * Every non-internal, share-link-attributed session in `scope`, tagged
   * with its prospect id and grouped by contact identity - the shared read
   * both `listAllContacts` and `listAllContactSessions` build on, so the org
   * scope query only runs once per call instead of once per method.
   */
  private async scopedContactGroups(
    scope: AnalyticsReadScope,
  ): Promise<Map<string, ScopedSessionView[]>> {
    const rows = await this.client.visitorSession.findMany({
      where: orgScopeWhere(scope),
      include: INCLUDE,
    });
    const views: ScopedSessionView[] = rows
      .filter((r) => r.shareLink != null)
      .map((r) => ({ ...toSessionView(r), prospectId: r.shareLink!.prospectId }));
    return groupSessionsByContact(views);
  }

  async listAllContacts(
    scope: AnalyticsReadScope,
    page?: PageOptions,
  ): Promise<Page<OrgContactView>> {
    const limit = clampLimit(page?.limit);
    const byContact = await this.scopedContactGroups(scope);

    const all: OrgContactView[] = Array.from(byContact.entries()).map(
      ([key, group]) => ({
        ...contactViewFromGroup(key, group),
        id: key,
        prospectIds: Array.from(new Set(group.map((v) => v.prospectId))).sort(),
      }),
    );
    // Newest-first, same order as listProspectContacts; ties broken by id so
    // the cursor position is deterministic across calls.
    all.sort(
      (a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt) || a.id.localeCompare(b.id),
    );

    const cursorId = decodeCursor(page?.cursor);
    let startIndex = 0;
    if (cursorId !== null) {
      const idx = all.findIndex((c) => c.id === cursorId);
      // Unknown/stale cursor (e.g. the row it pointed at fell out of scope
      // since) - fail closed to "no more rows" rather than restarting from
      // the top and re-serving already-seen contacts.
      if (idx === -1) return { items: [], nextCursor: null };
      startIndex = idx + 1;
    }
    return toPage(all.slice(startIndex, startIndex + limit + 1), limit);
  }

  async listAllContactSessions(
    contactKey: string,
    scope: AnalyticsReadScope,
  ): Promise<VisitorSessionView[]> {
    const group = (await this.scopedContactGroups(scope)).get(contactKey) ?? [];
    return [...group].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  async prospectTimeseries(
    prospectId: string,
    scope: AnalyticsReadScope,
    range: AnalyticsTimeRange,
    now: Date = new Date(),
  ): Promise<DemoKindTimeseriesPoint[]> {
    if (!isProspectInReadScope(scope, prospectId)) return [];
    const rows = await this.findByProspect(prospectId);
    return buildTimeseries(rows, range, now);
  }

  async prospectFunnel(
    prospectId: string,
    scope: AnalyticsReadScope,
    range: AnalyticsTimeRange = "all",
    now: Date = new Date(),
  ): Promise<FunnelStage[]> {
    if (!isProspectInReadScope(scope, prospectId)) return [];
    const rows = await this.findByProspect(prospectId);
    return buildFunnel(withinRange(rows, range, now));
  }

  /**
   * Org roll-ups span all demos, so there is no demoConfigId filter; the
   * prospect gate and range cutoff are pushed into the `where` clause via
   * `orgScopeWhere` instead of pulling every org session into JS.
   */
  async orgTimeseries(
    scope: AnalyticsReadScope,
    range: AnalyticsTimeRange,
    now: Date = new Date(),
  ): Promise<DemoKindTimeseriesPoint[]> {
    const rows = await this.client.visitorSession.findMany({
      where: orgScopeWhere(scope, range, now),
      include: INCLUDE,
    });
    return buildTimeseries(rows, range, now);
  }

  /**
   * Engagement funnel via 4 DB counts against the same scoped base `where`,
   * each narrowed by an `events.some` filter instead of loading every row.
   * The Completed stage is appended only when its count is actually > 0 -
   * never fabricated as always-zero.
   */
  async orgFunnel(
    scope: AnalyticsReadScope,
    range: AnalyticsTimeRange = "all",
    now: Date = new Date(),
  ): Promise<FunnelStage[]> {
    const base = orgScopeWhere(scope, range, now);
    const [viewed, interacted, authenticated, completed] = await Promise.all([
      this.client.visitorSession.count({ where: base }),
      this.client.visitorSession.count({
        where: {
          ...base,
          events: { some: { type: { in: ["step", "milestone"] } } },
        },
      }),
      this.client.visitorSession.count({
        where: {
          ...base,
          events: { some: { type: "milestone", name: IDENTITY_MILESTONE } },
        },
      }),
      this.client.visitorSession.count({
        where: {
          ...base,
          events: { some: { type: "milestone", name: COMPLETED_MILESTONE } },
        },
      }),
    ]);
    const stages: FunnelStage[] = [
      { key: "viewed", label: "Viewed", count: viewed },
      { key: "interacted", label: "Interacted", count: interacted },
      { key: "authenticated", label: "Authenticated", count: authenticated },
    ];
    if (completed > 0) {
      stages.push({ key: "completed", label: "Completed", count: completed });
    }
    return stages;
  }

  async orgDemoKindBreakdown(
    kindByConfigId: ReadonlyMap<string, DemoConfigKind>,
    scope: AnalyticsReadScope,
    range: AnalyticsTimeRange = "all",
    now: Date = new Date(),
  ): Promise<OrgDemoKindBreakdownRow[]> {
    const rows = await this.client.visitorSession.findMany({
      where: orgScopeWhere(scope, range, now),
      include: INCLUDE,
    });

    // Every kind in the map appears (zero-filled), so the comparison is stable
    // even for kinds with no in-scope sessions.
    const acc = new Map<
      DemoConfigKind,
      { sessions: number; viewers: Set<string> }
    >();
    for (const kind of kindByConfigId.values()) {
      if (!acc.has(kind)) acc.set(kind, { sessions: 0, viewers: new Set() });
    }
    for (const r of rows) {
      const kind = kindByConfigId.get(r.shareLink!.demoConfigId);
      if (!kind) continue;
      const bucket = acc.get(kind)!;
      bucket.sessions += 1;
      bucket.viewers.add(r.anonId);
    }

    return Array.from(acc.entries())
      .map(([kind, b]) => ({ kind, sessions: b.sessions, viewers: b.viewers.size }))
      .sort((a, b) => a.kind.localeCompare(b.kind));
  }

  /**
   * Demo-catalog landing funnel. Reuses `VisitorSession` + `TrackEvent` -
   * no schema change: a catalog visit is `demoSlug="catalog"` with no share
   * link (`shareLinkId=null`), and a launch is that session's
   * `demo_launch` event carrying `props.demo`. Isolated from every
   * prospect/share-link read above: this is the only method in the class
   * that queries `shareLinkId: null` instead of `{ not: null }`, so it can
   * never contend with or alter those reads.
   */
  async catalogFunnel(): Promise<CatalogFunnel> {
    const rows = await this.client.visitorSession.findMany({
      where: CATALOG_WHERE,
      include: INCLUDE,
    });
    const visits = rows.length;
    const uniqueVisitors = new Set(rows.map((r) => r.anonId)).size;
    return { visits, uniqueVisitors, byDemo: buildCatalogByDemo(rows, uniqueVisitors) };
  }

  /**
   * Per-demo launch trend (the drill-down behind a `catalogFunnel` row).
   * Reads the same isolated catalog slice (`CATALOG_WHERE`, no share-link
   * join) and buckets one demo's launches by day - see
   * `buildCatalogDemoTimeseries`.
   */
  async catalogDemoTimeseries(
    slug: string,
    range: AnalyticsTimeRange,
    now: Date = new Date(),
  ): Promise<CatalogDemoTimeseriesPoint[]> {
    const rows = await this.client.visitorSession.findMany({
      where: CATALOG_WHERE,
      include: INCLUDE,
    });
    return buildCatalogDemoTimeseries(rows, slug, range, now);
  }
}
