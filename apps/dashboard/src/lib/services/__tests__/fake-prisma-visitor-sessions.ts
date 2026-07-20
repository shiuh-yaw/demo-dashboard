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
} {
  const sessions = new Map<string, VisitorSessionRow>();
  const events = new Map<string, TrackEventRow>();
  const now = () => new Date();

  return {
    __sessions: sessions,
    __events: events,
    visitorSession: {
      async findUnique({ where }) {
        const row = sessions.get(where.id);
        return row ? { ...row } : null;
      },
      async create({ data }) {
        // Enforce the `VisitorSession` primary key uniqueness, mirroring
        // Postgres - the service always attempts `create` first (see
        // `upsertFromBatch`), relying on this to signal an existing row
        // via P2002 rather than a pre-flight `findUnique`.
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
        };
        sessions.set(where.id, updated);
        return { ...updated };
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
