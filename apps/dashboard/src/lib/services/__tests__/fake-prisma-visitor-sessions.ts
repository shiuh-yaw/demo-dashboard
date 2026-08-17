/**
 * Minimal in-memory fake for the `prisma.visitorSession` / `prisma.trackEvent`
 * delegates used by `PostgresVisitorSessionService`. Hand-rolled rather
 * than the real PrismaClient because the service only depends on a small
 * slice (session findUnique/create/update by id, event createMany with
 * skipDuplicates). Real-database coverage lives in the CI migration
 * dry-run job.
 */

import type { VisitorSessionPrismaClient } from "../postgres/visitor-sessions";

/**
 * Mimic Prisma's "P2002" error so the service-layer's create-then-catch
 * race fallback (see `PostgresVisitorSessionService.upsertFromBatch`) is
 * exercised by tests without depending on the real
 * `PrismaClientKnownRequestError`.
 */
class FakePrismaUniqueViolation extends Error {
  public readonly code = "P2002";
  constructor(target: string) {
    super(`Unique constraint failed on ${target}`);
    this.name = "PrismaClientKnownRequestError";
  }
}

interface VisitorSessionRow {
  id: string;
  shareLinkId: string | null;
  demoSlug: string;
  anonId: string;
  startedAt: Date;
  lastSeenAt: Date;
  device: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  ipHash: string | null;
  isInternal: boolean;
  enrichment: unknown | null;
  identifiedUserId: string | null;
  identifiedEmail: string | null;
  identityTraits: Record<string, unknown> | null;
}

interface TrackEventRow {
  id: string;
  sessionId: string;
  ts: Date;
  type: string;
  name: string;
  path: string | null;
  props: Record<string, unknown> | null;
}

export function createFakeVisitorSessionPrisma(): VisitorSessionPrismaClient & {
  __sessions: Map<string, VisitorSessionRow>;
  __events: Map<string, TrackEventRow>;
  /**
   * Simulate a concurrent batch winning the create race: the next
   * `create` first inserts `row` (the race winner) and then throws P2002,
   * so the service's find-first path (findUnique returned null, create
   * then loses) hits its P2002 fallback.
   */
  __raceOnNextCreate: (row: VisitorSessionRow) => void;
} {
  const sessions = new Map<string, VisitorSessionRow>();
  const events = new Map<string, TrackEventRow>();
  const now = () => new Date();
  let pendingRace: VisitorSessionRow | null = null;

  return {
    __sessions: sessions,
    __events: events,
    __raceOnNextCreate(row) {
      pendingRace = row;
    },
    visitorSession: {
      async findUnique({ where }) {
        const row = sessions.get(where.id);
        return row ? { ...row } : null;
      },
      async create({ data }) {
        // A pending race means a concurrent writer inserted the row after
        // our findUnique returned null; mirror that then fail with P2002.
        if (pendingRace) {
          const raced = pendingRace;
          pendingRace = null;
          sessions.set(raced.id, raced);
          throw new FakePrismaUniqueViolation("VisitorSession_pkey");
        }
        // Enforce the `VisitorSession` primary key uniqueness, mirroring
        // Postgres - the service only reaches `create` for a session its
        // pre-flight `findUnique` did not find.
        if (sessions.has(data.id)) {
          throw new FakePrismaUniqueViolation("VisitorSession_pkey");
        }
        const ts = now();
        const row: VisitorSessionRow = {
          id: data.id,
          shareLinkId: data.shareLinkId,
          demoSlug: data.demoSlug,
          anonId: data.anonId,
          startedAt: ts,
          lastSeenAt: data.lastSeenAt,
          device: data.device,
          os: data.os,
          browser: data.browser,
          country: data.country,
          region: data.region,
          city: data.city,
          ipHash: data.ipHash,
          isInternal: data.isInternal,
          enrichment: null,
          identifiedUserId: data.identifiedUserId ?? null,
          identifiedEmail: data.identifiedEmail ?? null,
          identityTraits: data.identityTraits ?? null,
        };
        sessions.set(data.id, row);
        return { ...row };
      },
      async update({ where, data }) {
        const existing = sessions.get(where.id);
        if (!existing) {
          throw new Error(`Record to update not found. id=${where.id}`);
        }
        const updated: VisitorSessionRow = {
          ...existing,
          lastSeenAt: data.lastSeenAt,
          ...(data.identifiedUserId !== undefined
            ? { identifiedUserId: data.identifiedUserId }
            : {}),
          ...(data.identifiedEmail !== undefined
            ? { identifiedEmail: data.identifiedEmail }
            : {}),
          ...(data.identityTraits !== undefined
            ? { identityTraits: data.identityTraits }
            : {}),
        };
        sessions.set(where.id, updated);
        return { ...updated };
      },
      async updateMany({ where, data }) {
        const existing = sessions.get(where.id);
        if (!existing) return { count: 0 };
        // An absent `enrichment` predicate is the overwrite case. When it IS
        // present it mirrors Prisma's `enrichment: { equals: Prisma.DbNull }`
        // semantics: matches only while the column is still null, same as the
        // real write-once guard.
        if (where.enrichment && existing.enrichment !== null) {
          return { count: 0 };
        }
        sessions.set(where.id, { ...existing, enrichment: data.enrichment });
        return { count: 1 };
      },
      async findMany({ take }) {
        // Mirrors `listUnenriched`'s SQL half only: sessions with a captured
        // email, newest first, bounded by `take`. The "carries no company"
        // test runs in the service, over the `enrichment` this returns.
        return Array.from(sessions.values())
          .filter((s) => s.identifiedEmail !== null)
          .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
          .slice(0, take)
          .map((s) => ({
            id: s.id,
            identifiedEmail: s.identifiedEmail,
            enrichment: s.enrichment,
          }));
      },
    },
    trackEvent: {
      async createMany({ data, skipDuplicates }) {
        let count = 0;
        for (const event of data) {
          if (skipDuplicates && events.has(event.id)) continue;
          events.set(event.id, { ...event });
          count++;
        }
        return { count };
      },
    },
  };
}
