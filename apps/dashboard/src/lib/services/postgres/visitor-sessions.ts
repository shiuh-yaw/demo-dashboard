/**
 * Postgres-backed VisitorSessionService (Prisma + Supabase via
 * @dynamic-demos/db). Write path only. Postgres-only, no cutover flag.
 * `VisitorSession.id` / `TrackEvent.id` are client-generated UUIDs
 * (packages/analytics mints them) - no `@default`, so every insert here is
 * idempotent-friendly: session upsert-by-id, events
 * `createMany({ skipDuplicates: true })`.
 *
 * D-013: this module never opens its own connection - it relies on the
 * `prisma` singleton from @dynamic-demos/db. D-015: only apps/dashboard
 * imports @dynamic-demos/db.
 */

import { prisma as defaultPrisma } from "@dynamic-demos/db";
import type {
  TrackBatchInput,
  UpsertVisitorSessionResult,
  VisitorSessionMeta,
  VisitorSessionService,
} from "../types";

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

/** "heartbeat"-named events advance `lastSeenAt` but are never persisted. */
const HEARTBEAT_EVENT_NAME = "heartbeat";

/**
 * Detect Prisma's "unique constraint failed" error without dragging the
 * full `PrismaClientKnownRequestError` runtime into the service file.
 * Code `P2002` is documented in the Prisma error reference - checking by
 * `code` is robust to message-copy changes across Prisma versions.
 */
function isUniqueConstraintError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === "P2002";
}

/**
 * Minimal subset of the Prisma client used by PostgresVisitorSessionService.
 * Lets unit tests inject an in-memory fake. The real `PrismaClient` from
 * @dynamic-demos/db structurally satisfies this interface.
 */
export interface VisitorSessionPrismaClient {
  visitorSession: {
    findUnique(args: {
      where: { id: string };
    }): Promise<VisitorSessionRow | null>;
    create(args: {
      data: {
        id: string;
        shareLinkId: string | null;
        demoSlug: string;
        anonId: string;
        lastSeenAt: Date;
        device: string | null;
        os: string | null;
        browser: string | null;
        country: string | null;
        region: string | null;
        city: string | null;
        ipHash: string | null;
        isInternal: boolean;
      };
    }): Promise<VisitorSessionRow>;
    update(args: {
      where: { id: string };
      data: { lastSeenAt: Date };
    }): Promise<VisitorSessionRow>;
  };
  trackEvent: {
    createMany(args: {
      data: Array<{
        id: string;
        sessionId: string;
        ts: Date;
        type: string;
        name: string;
        path: string | null;
        props: Record<string, unknown> | null;
      }>;
      skipDuplicates: boolean;
    }): Promise<{ count: number }>;
  };
}

export class PostgresVisitorSessionService implements VisitorSessionService {
  private readonly client: VisitorSessionPrismaClient;

  constructor(client?: VisitorSessionPrismaClient) {
    this.client =
      client ?? (defaultPrisma as unknown as VisitorSessionPrismaClient);
  }

  async upsertFromBatch(
    batch: TrackBatchInput,
    meta: VisitorSessionMeta,
  ): Promise<UpsertVisitorSessionResult> {
    const maxEventTs = batch.events.reduce(
      (max, event) => Math.max(max, event.ts),
      0,
    );
    const maxEventDate = maxEventTs > 0 ? new Date(maxEventTs) : new Date();

    // Atomic create-first: try the insert directly rather than
    // find-then-create/update. Two concurrent batches racing to create
    // the same new sessionId used to both see `findUnique` return null,
    // then both call `create` - the loser threw an unhandled P2002. Now
    // the loser catches its own P2002 and falls through to the same
    // forward-only update path an "already exists" batch takes.
    let created: boolean;
    try {
      await this.client.visitorSession.create({
        data: {
          id: batch.sessionId,
          shareLinkId: meta.shareLinkId,
          demoSlug: batch.demoSlug,
          anonId: batch.anonId,
          lastSeenAt: maxEventDate,
          device: meta.ua.device ?? null,
          os: meta.ua.os ?? null,
          browser: meta.ua.browser ?? null,
          country: meta.geo.country ?? null,
          region: meta.geo.region ?? null,
          city: meta.geo.city ?? null,
          ipHash: meta.ipHash,
          isInternal: meta.isInternal,
        },
      });
      created = true;
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      created = false;
    }

    if (!created) {
      const existing = await this.client.visitorSession.findUnique({
        where: { id: batch.sessionId },
      });
      // Forward-only: never move lastSeenAt backward, e.g. an
      // out-of-order retry replaying an older batch after a newer one.
      // `existing` should always be present here (we either lost the
      // create race above or this session already existed); fall back to
      // maxEventDate defensively if not.
      const existingLastSeenAt = existing?.lastSeenAt ?? new Date(0);
      const nextLastSeenAt =
        maxEventDate.getTime() > existingLastSeenAt.getTime()
          ? maxEventDate
          : existingLastSeenAt;
      await this.client.visitorSession.update({
        where: { id: batch.sessionId },
        data: { lastSeenAt: nextLastSeenAt },
      });
    }

    const persistableEvents = batch.events.filter(
      (event) => event.name !== HEARTBEAT_EVENT_NAME,
    );
    if (persistableEvents.length > 0) {
      await this.client.trackEvent.createMany({
        data: persistableEvents.map((event) => ({
          id: event.eventId,
          sessionId: batch.sessionId,
          ts: new Date(event.ts),
          type: event.type,
          name: event.name,
          path: event.path ?? null,
          props: event.props ?? null,
        })),
        skipDuplicates: true,
      });
    }

    return { created };
  }
}
