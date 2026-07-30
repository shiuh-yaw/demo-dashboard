/**
 * PostgresVisitorSessionService - write path. Postgres-only (no legacy
 * Redis equivalent), backed by an in-memory fake of the
 * `prisma.visitorSession` / `prisma.trackEvent` delegates.
 */

import { describe, expect, it } from "vitest";

import { PostgresVisitorSessionService } from "@/lib/services/postgres/visitor-sessions";
import type {
  TrackBatchInput,
  VisitorSessionMeta,
} from "@/lib/services/types";

import { createFakeVisitorSessionPrisma } from "./fake-prisma-visitor-sessions";

const baseMeta: VisitorSessionMeta = {
  geo: { country: "US", region: "NY", city: "New York" },
  ua: { device: "desktop", os: "macOS", browser: "Chrome" },
  ipHash: "hash_abc",
  shareLinkId: "sl_1",
  isInternal: false,
};

function makeBatch(overrides: Partial<TrackBatchInput> = {}): TrackBatchInput {
  return {
    sessionId: "11111111-1111-1111-1111-111111111111",
    anonId: "22222222-2222-2222-2222-222222222222",
    demoSlug: "wallet",
    events: [
      {
        eventId: "33333333-3333-3333-3333-333333333333",
        type: "pageview",
        name: "pageview",
        path: "/",
        ts: 1_000,
      },
    ],
    ...overrides,
  };
}

describe("PostgresVisitorSessionService", () => {
  it("creates a session + event on first batch and reports created: true", async () => {
    const client = createFakeVisitorSessionPrisma();
    const svc = new PostgresVisitorSessionService(client);

    const result = await svc.upsertFromBatch(makeBatch(), baseMeta);
    expect(result.created).toBe(true);

    const session = client.__sessions.get(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(session).toBeDefined();
    expect(session!.demoSlug).toBe("wallet");
    expect(session!.anonId).toBe("22222222-2222-2222-2222-222222222222");
    expect(session!.shareLinkId).toBe("sl_1");
    expect(session!.country).toBe("US");
    expect(session!.device).toBe("desktop");
    expect(session!.ipHash).toBe("hash_abc");
    expect(session!.lastSeenAt.getTime()).toBe(1_000);

    const event = client.__events.get(
      "33333333-3333-3333-3333-333333333333",
    );
    expect(event).toBeDefined();
    expect(event!.name).toBe("pageview");
  });

  it("reports created: false on the second batch for the same session", async () => {
    const client = createFakeVisitorSessionPrisma();
    const svc = new PostgresVisitorSessionService(client);

    await svc.upsertFromBatch(makeBatch(), baseMeta);
    const second = await svc.upsertFromBatch(
      makeBatch({
        events: [
          {
            eventId: "44444444-4444-4444-4444-444444444444",
            type: "step",
            name: "step-2",
            ts: 2_000,
          },
        ],
      }),
      baseMeta,
    );
    expect(second.created).toBe(false);
  });

  it("duplicate event ids are silently skipped (skipDuplicates)", async () => {
    const client = createFakeVisitorSessionPrisma();
    const svc = new PostgresVisitorSessionService(client);

    await svc.upsertFromBatch(makeBatch(), baseMeta);
    // Same eventId, different name - the retry must not overwrite the row
    // nor throw; it's simply skipped.
    await svc.upsertFromBatch(
      makeBatch({
        events: [
          {
            eventId: "33333333-3333-3333-3333-333333333333",
            type: "pageview",
            name: "pageview-retried",
            ts: 1_500,
          },
        ],
      }),
      baseMeta,
    );

    expect(client.__events.size).toBe(1);
    expect(
      client.__events.get("33333333-3333-3333-3333-333333333333")!.name,
    ).toBe("pageview");
  });

  it("heartbeat-named events advance lastSeenAt without a TrackEvent row", async () => {
    const client = createFakeVisitorSessionPrisma();
    const svc = new PostgresVisitorSessionService(client);

    await svc.upsertFromBatch(makeBatch(), baseMeta);
    await svc.upsertFromBatch(
      makeBatch({
        events: [
          {
            eventId: "55555555-5555-5555-5555-555555555555",
            type: "pageview",
            name: "heartbeat",
            ts: 5_000,
          },
        ],
      }),
      baseMeta,
    );

    const session = client.__sessions.get(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(session!.lastSeenAt.getTime()).toBe(5_000);
    expect(
      client.__events.has("55555555-5555-5555-5555-555555555555"),
    ).toBe(false);
    expect(client.__events.size).toBe(1); // only the original pageview
  });

  it("second batch never moves lastSeenAt backward", async () => {
    const client = createFakeVisitorSessionPrisma();
    const svc = new PostgresVisitorSessionService(client);

    await svc.upsertFromBatch(
      makeBatch({
        events: [
          {
            eventId: "66666666-6666-6666-6666-666666666666",
            type: "pageview",
            name: "pageview",
            ts: 10_000,
          },
        ],
      }),
      baseMeta,
    );
    await svc.upsertFromBatch(
      makeBatch({
        events: [
          {
            eventId: "77777777-7777-7777-7777-777777777777",
            type: "step",
            name: "older-retry",
            ts: 3_000,
          },
        ],
      }),
      baseMeta,
    );

    const session = client.__sessions.get(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(session!.lastSeenAt.getTime()).toBe(10_000);
  });

  it("reports created: false and forward-only-updates lastSeenAt when a concurrent batch wins the create race for a new sessionId", async () => {
    // find-first: our findUnique returns null, but a concurrent batch
    // inserts the row before our own `create`, which then throws P2002.
    // The service must fall back to the forward-only update path instead
    // of throwing.
    const client = createFakeVisitorSessionPrisma();
    client.__raceOnNextCreate({
      id: "11111111-1111-1111-1111-111111111111",
      shareLinkId: "sl_1",
      demoSlug: "wallet",
      anonId: "22222222-2222-2222-2222-222222222222",
      startedAt: new Date(500),
      lastSeenAt: new Date(500),
      device: "desktop",
      os: "macOS",
      browser: "Chrome",
      country: "US",
      region: "NY",
      city: "New York",
      ipHash: "hash_abc",
      isInternal: false,
      enrichment: null,
    });
    const svc = new PostgresVisitorSessionService(client);

    const result = await svc.upsertFromBatch(makeBatch(), baseMeta);
    expect(result.created).toBe(false);

    const session = client.__sessions.get(
      "11111111-1111-1111-1111-111111111111",
    );
    // makeBatch()'s event ts (1_000) is newer than the raced-in row's
    // lastSeenAt (500), so it should still advance forward.
    expect(session!.lastSeenAt.getTime()).toBe(1_000);
  });
});
