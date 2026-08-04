import { describe, expect, it } from "vitest";
import { trackBatchSchema, trackEventSchema } from "../src/schema";

const validEvent = {
  eventId: "11111111-1111-4111-8111-111111111111",
  type: "pageview" as const,
  name: "pageview",
  ts: Date.now(),
};

function makeBatch(overrides: Partial<Parameters<typeof trackBatchSchema.parse>[0]> = {}) {
  return {
    sessionId: "22222222-2222-4222-8222-222222222222",
    anonId: "33333333-3333-4333-8333-333333333333",
    demoSlug: "wallet",
    events: [validEvent],
    ...overrides,
  };
}

describe("trackEventSchema", () => {
  it("parses a valid event", () => {
    expect(() => trackEventSchema.parse(validEvent)).not.toThrow();
  });

  it("rejects a bad uuid for eventId", () => {
    expect(() =>
      trackEventSchema.parse({ ...validEvent, eventId: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects an oversized props payload", () => {
    const bigProps = { blob: "x".repeat(3000) };
    expect(() =>
      trackEventSchema.parse({ ...validEvent, props: bigProps }),
    ).toThrow();
  });

  it("accepts props right at the size cap", () => {
    // eventId/type/name/ts overhead aside, this just needs the *props*
    // serialization itself to sit at/under 2048.
    const okProps = { blob: "x".repeat(2000) };
    expect(() =>
      trackEventSchema.parse({ ...validEvent, props: okProps }),
    ).not.toThrow();
  });

  it("rejects an empty name", () => {
    expect(() => trackEventSchema.parse({ ...validEvent, name: "" })).toThrow();
  });

  it("rejects an unknown event type", () => {
    expect(() =>
      trackEventSchema.parse({ ...validEvent, type: "click" }),
    ).toThrow();
  });

  it("accepts the identify event type", () => {
    expect(() =>
      trackEventSchema.parse({ ...validEvent, type: "identify", name: "identify" }),
    ).not.toThrow();
  });
});

describe("trackBatchSchema", () => {
  it("parses a valid batch", () => {
    expect(() => trackBatchSchema.parse(makeBatch())).not.toThrow();
  });

  it("parses a valid batch with shareToken and isInternal", () => {
    expect(() =>
      trackBatchSchema.parse(
        makeBatch({ shareToken: "abc123", isInternal: true }),
      ),
    ).not.toThrow();
  });

  it("rejects a batch with more than 50 events", () => {
    const events = Array.from({ length: 51 }, () => validEvent);
    expect(() => trackBatchSchema.parse(makeBatch({ events }))).toThrow();
  });

  it("accepts exactly 50 events", () => {
    const events = Array.from({ length: 50 }, () => validEvent);
    expect(() => trackBatchSchema.parse(makeBatch({ events }))).not.toThrow();
  });

  it("rejects an empty events array", () => {
    expect(() => trackBatchSchema.parse(makeBatch({ events: [] }))).toThrow();
  });

  it("rejects a bad uuid for anonId", () => {
    expect(() =>
      trackBatchSchema.parse(makeBatch({ anonId: "not-a-uuid" })),
    ).toThrow();
  });

  it("rejects a bad uuid for sessionId", () => {
    expect(() =>
      trackBatchSchema.parse(makeBatch({ sessionId: "not-a-uuid" })),
    ).toThrow();
  });

  it("parses a valid batch without an identity (backward-compat)", () => {
    const batch = makeBatch();
    expect("identity" in batch).toBe(false);
    expect(() => trackBatchSchema.parse(batch)).not.toThrow();
  });

  it("parses a valid batch with an identity (userId, email, traits)", () => {
    expect(() =>
      trackBatchSchema.parse(
        makeBatch({
          identity: { userId: "u_1", email: "a@b.co", traits: { plan: "pro" } },
        }),
      ),
    ).not.toThrow();
  });

  it("parses a valid batch with an identity that omits email/traits", () => {
    expect(() =>
      trackBatchSchema.parse(makeBatch({ identity: { userId: "u_1" } })),
    ).not.toThrow();
  });

  it("rejects an identity with an empty userId", () => {
    expect(() =>
      trackBatchSchema.parse(makeBatch({ identity: { userId: "" } })),
    ).toThrow();
  });

  it("rejects an identity with an oversized userId", () => {
    expect(() =>
      trackBatchSchema.parse(
        makeBatch({ identity: { userId: "u".repeat(129) } }),
      ),
    ).toThrow();
  });
});
