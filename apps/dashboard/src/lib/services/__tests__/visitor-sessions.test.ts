/**
 * PostgresVisitorSessionService - write path. Postgres-only (no legacy
 * Redis equivalent), backed by an in-memory fake of the
 * `prisma.visitorSession` / `prisma.trackEvent` delegates.
 */

import { describe, expect, it } from "vitest";

import type { EnrichmentResult } from "@/lib/enrichment/types";
import { PostgresVisitorSessionService } from "@/lib/services/postgres/visitor-sessions";
import type {
  TrackBatchInput,
  VisitorSessionMeta,
} from "@/lib/services/types";

import { createFakeVisitorSessionPrisma } from "./fake-prisma-visitor-sessions";

const SAMPLE_ENRICHMENT: EnrichmentResult = {
  company: { name: "Acme Corp", domain: "acme.com" },
  provider: "ipinfo",
  confidence: "medium",
  enrichedAt: "2026-01-01T00:00:00.000Z",
};

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
      identifiedUserId: null,
      identifiedEmail: null,
      identityTraits: null,
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

  describe("setEnrichment (Phase GTM-10 write-once)", () => {
    it("writes the result onto a session with null enrichment", async () => {
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);
      await svc.upsertFromBatch(makeBatch(), baseMeta);

      await svc.setEnrichment(
        "11111111-1111-1111-1111-111111111111",
        SAMPLE_ENRICHMENT,
      );

      const session = client.__sessions.get(
        "11111111-1111-1111-1111-111111111111",
      );
      expect(session!.enrichment).toEqual(SAMPLE_ENRICHMENT);
    });

    it("never overwrites an existing enrichment result (idempotent under retries)", async () => {
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);
      await svc.upsertFromBatch(makeBatch(), baseMeta);
      await svc.setEnrichment(
        "11111111-1111-1111-1111-111111111111",
        SAMPLE_ENRICHMENT,
      );

      const secondResult: EnrichmentResult = {
        company: { name: "Different Corp" },
        provider: "ipinfo",
        confidence: "low",
        enrichedAt: "2026-02-02T00:00:00.000Z",
      };
      await svc.setEnrichment(
        "11111111-1111-1111-1111-111111111111",
        secondResult,
      );

      const session = client.__sessions.get(
        "11111111-1111-1111-1111-111111111111",
      );
      expect(session!.enrichment).toEqual(SAMPLE_ENRICHMENT);
    });

    it("reports false (no write) when the session does not exist", async () => {
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);

      await expect(
        svc.setEnrichment("nonexistent-session", SAMPLE_ENRICHMENT),
      ).resolves.toBe(false);
      expect(client.__sessions.size).toBe(0);
    });

    it("reports true on the write and false on a repeat", async () => {
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);
      await svc.upsertFromBatch(makeBatch(), baseMeta);
      const id = "11111111-1111-1111-1111-111111111111";

      await expect(svc.setEnrichment(id, SAMPLE_ENRICHMENT)).resolves.toBe(true);
      await expect(svc.setEnrichment(id, SAMPLE_ENRICHMENT)).resolves.toBe(false);
    });

    it("overwrite replaces existing enrichment - the operator-initiated path", async () => {
      // Without this, a row holding company-less legacy enrichment could never
      // be repaired: the null-only guard refuses it on every attempt.
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);
      await svc.upsertFromBatch(makeBatch(), baseMeta);
      const id = "11111111-1111-1111-1111-111111111111";
      client.__sessions.set(id, {
        ...client.__sessions.get(id)!,
        enrichment: { city: "Tel Aviv" },
      });

      await expect(
        svc.setEnrichment(id, SAMPLE_ENRICHMENT, { overwrite: true }),
      ).resolves.toBe(true);
      expect(client.__sessions.get(id)!.enrichment).toEqual(SAMPLE_ENRICHMENT);
    });
  });

  describe("listUnenriched (backfill input)", () => {
    const SESSION_ID = "11111111-1111-1111-1111-111111111111";

    it("returns sessions that captured an email and have no enrichment", async () => {
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);
      await svc.upsertFromBatch(
        makeBatch({ identity: { userId: "user_1", email: "jo@acme.com" } }),
        baseMeta,
      );

      expect(await svc.listUnenriched(100)).toEqual([
        { id: SESSION_ID, email: "jo@acme.com" },
      ]);
    });

    it("excludes sessions that never captured an email", async () => {
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);
      await svc.upsertFromBatch(makeBatch(), baseMeta);

      expect(await svc.listUnenriched(100)).toEqual([]);
    });

    it("excludes already-enriched sessions so a re-run never pays twice", async () => {
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);
      await svc.upsertFromBatch(
        makeBatch({ identity: { userId: "user_1", email: "jo@acme.com" } }),
        baseMeta,
      );
      await svc.setEnrichment(SESSION_ID, SAMPLE_ENRICHMENT);

      expect(await svc.listUnenriched(100)).toEqual([]);
    });

    it("includes a row whose stored enrichment carries NO company", async () => {
      // The bug this covers: eligibility asked "is a company readable?" while
      // the write guard asked "is the column null?". Legacy geo-only
      // enrichment answered yes/no, so it was enriched and then refused.
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);
      await svc.upsertFromBatch(
        makeBatch({ identity: { userId: "user_1", email: "jo@acme.com" } }),
        baseMeta,
      );
      const row = client.__sessions.get(SESSION_ID)!;
      client.__sessions.set(SESSION_ID, {
        ...row,
        enrichment: { city: "Tel Aviv", country: "IL" },
      });

      expect(await svc.listUnenriched(100)).toEqual([
        { id: SESSION_ID, email: "jo@acme.com" },
      ]);
    });

    it("excludes a row whose enrichment carries a company under a legacy shape", async () => {
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);
      await svc.upsertFromBatch(
        makeBatch({ identity: { userId: "user_1", email: "jo@acme.com" } }),
        baseMeta,
      );
      const row = client.__sessions.get(SESSION_ID)!;
      client.__sessions.set(SESSION_ID, {
        ...row,
        enrichment: { org: "AS13335 Cloudflare" },
      });

      expect(await svc.listUnenriched(100)).toEqual([]);
    });

    it("honours the limit", async () => {
      const client = createFakeVisitorSessionPrisma();
      const svc = new PostgresVisitorSessionService(client);
      await svc.upsertFromBatch(
        makeBatch({ identity: { userId: "user_1", email: "jo@acme.com" } }),
        baseMeta,
      );

      expect(await svc.listUnenriched(0)).toEqual([]);
    });
  });

  it("persists identity on the create path when batch.identity is present", async () => {
    const client = createFakeVisitorSessionPrisma();
    const svc = new PostgresVisitorSessionService(client);

    await svc.upsertFromBatch(
      makeBatch({
        identity: {
          userId: "user_1",
          email: "person@example.com",
          traits: { plan: "pro" },
        },
      }),
      baseMeta,
    );

    const session = client.__sessions.get(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(session!.identifiedUserId).toBe("user_1");
    expect(session!.identifiedEmail).toBe("person@example.com");
    expect(session!.identityTraits).toEqual({ plan: "pro" });
  });

  it("persists identity on the update path when batch.identity is present on a later batch", async () => {
    const client = createFakeVisitorSessionPrisma();
    const svc = new PostgresVisitorSessionService(client);

    await svc.upsertFromBatch(makeBatch(), baseMeta);
    await svc.upsertFromBatch(
      makeBatch({
        events: [
          {
            eventId: "44444444-4444-4444-4444-444444444444",
            type: "identify",
            name: "identify",
            ts: 2_000,
          },
        ],
        identity: { userId: "user_1", email: "person@example.com" },
      }),
      baseMeta,
    );

    const session = client.__sessions.get(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(session!.identifiedUserId).toBe("user_1");
    expect(session!.identifiedEmail).toBe("person@example.com");
  });

  it("a later batch without identity does not null out a previously-persisted identity", async () => {
    const client = createFakeVisitorSessionPrisma();
    const svc = new PostgresVisitorSessionService(client);

    await svc.upsertFromBatch(
      makeBatch({ identity: { userId: "user_1", email: "person@example.com" } }),
      baseMeta,
    );
    await svc.upsertFromBatch(
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

    const session = client.__sessions.get(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(session!.identifiedUserId).toBe("user_1");
    expect(session!.identifiedEmail).toBe("person@example.com");
  });

  it("a later identify() call with a new userId last-wins over the stored identity", async () => {
    const client = createFakeVisitorSessionPrisma();
    const svc = new PostgresVisitorSessionService(client);

    await svc.upsertFromBatch(
      makeBatch({ identity: { userId: "user_1", email: "first@example.com" } }),
      baseMeta,
    );
    await svc.upsertFromBatch(
      makeBatch({
        events: [
          {
            eventId: "44444444-4444-4444-4444-444444444444",
            type: "identify",
            name: "identify",
            ts: 2_000,
          },
        ],
        identity: { userId: "user_2", email: "second@example.com" },
      }),
      baseMeta,
    );

    const session = client.__sessions.get(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(session!.identifiedUserId).toBe("user_2");
    expect(session!.identifiedEmail).toBe("second@example.com");
  });

  it("a partial identity (no email) does not null out a previously-captured email", async () => {
    const client = createFakeVisitorSessionPrisma();
    const svc = new PostgresVisitorSessionService(client);

    await svc.upsertFromBatch(
      makeBatch({ identity: { userId: "user_1", email: "person@example.com" } }),
      baseMeta,
    );
    await svc.upsertFromBatch(
      makeBatch({
        events: [
          {
            eventId: "44444444-4444-4444-4444-444444444444",
            type: "identify",
            name: "identify",
            ts: 2_000,
          },
        ],
        identity: { userId: "user_1" },
      }),
      baseMeta,
    );

    const session = client.__sessions.get(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(session!.identifiedUserId).toBe("user_1");
    expect(session!.identifiedEmail).toBe("person@example.com");
  });
});
