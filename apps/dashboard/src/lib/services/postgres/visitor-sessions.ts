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
  identifiedUserId: string | null;
  identifiedEmail: string | null;
  identityTraits: unknown | null;
}

/** "heartbeat"-named events advance `lastSeenAt` but are never persisted. */
const HEARTBEAT_EVENT_NAME = "heartbeat";

/**
 * Fields to merge into an `update` call for `batch.identity` - only the
 * per-field values actually present on this batch, so a batch with no
 * identity (or a partial identity missing e.g. `email`) never overwrites a
 * previously-persisted value with null/undefined. Last-wins is per-field:
 * a present value always replaces the stored one.
 */
function identityUpdateFields(identity: TrackBatchInput["identity"]): {
  identifiedUserId?: string;
  identifiedEmail?: string;
  identityTraits?: Record<string, unknown>;
} {
  if (!identity) return {};
  return {
    ...(identity.userId ? { identifiedUserId: identity.userId } : {}),
    ...(identity.email ? { identifiedEmail: identity.email } : {}),
    ...(identity.traits ? { identityTraits: identity.traits } : {}),
  };
}

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
        identifiedUserId?: string | null;
        identifiedEmail?: string | null;
        identityTraits?: Record<string, unknown> | null;
      };
    }): Promise<VisitorSessionRow>;
    update(args: {
      where: { id: string };
      data: {
        lastSeenAt: Date;
        identifiedUserId?: string;
        identifiedEmail?: string;
        identityTraits?: Record<string, unknown>;
      };
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

    // Find-first: only a genuinely new session INSERTs. The steady state
    // is an existing session emitting a heartbeat every ~15s; a
    // create-first strategy fires an INSERT for each one, and Postgres
    // logs a duplicate-key (23505) error every time even though Prisma's
    // P2002 is caught in-process - flooding the prod DB logs. Looking the
    // row up first means existing sessions never attempt an INSERT.
    // A concurrent batch that wins the create race for a new sessionId
    // still surfaces P2002 on our create; we catch it and fall through to
    // the same forward-only update path.
    const existing = await this.client.visitorSession.findUnique({
      where: { id: batch.sessionId },
    });

    let created = false;
    if (!existing) {
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
            identifiedUserId: batch.identity?.userId ?? null,
            identifiedEmail: batch.identity?.email ?? null,
            identityTraits: batch.identity?.traits ?? null,
          },
        });
        created = true;
      } catch (err) {
        if (!isUniqueConstraintError(err)) throw err;
        // Lost the create race - the winner's row now exists; fall through.
      }
    }

    if (!created) {
      // Forward-only: never move lastSeenAt backward, e.g. an out-of-order
      // retry replaying an older batch after a newer one. Re-read for the
      // race-loser case where `existing` was null but the row exists now.
      const current =
        existing ??
        (await this.client.visitorSession.findUnique({
          where: { id: batch.sessionId },
        }));
      const existingLastSeenAt = current?.lastSeenAt ?? new Date(0);
      const nextLastSeenAt =
        maxEventDate.getTime() > existingLastSeenAt.getTime()
          ? maxEventDate
          : existingLastSeenAt;
      await this.client.visitorSession.update({
        where: { id: batch.sessionId },
        data: {
          lastSeenAt: nextLastSeenAt,
          ...identityUpdateFields(batch.identity),
        },
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
