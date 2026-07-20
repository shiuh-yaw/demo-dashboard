/**
 * Tests for the deterministic prospect-resolver shared across every per-kind
 * demo-config mapper. The resolver is the single source of truth for
 * mapping `(ownerId, themed-config)` onto a Prospect row — both at action-
 * layer write time and at backfill time — so action-created and
 * backfill-created demos converge on the same `Prospect`.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { RedisProspectService } from "@/lib/services/redis/prospects";
import type { ProspectService } from "@/lib/services/types";

import { resolveProspect } from "../prospect-resolver";
import { createFakeRedis } from "../../__tests__/fake-redis";

describe("resolveProspect", () => {
  let prospects: ProspectService;

  beforeEach(() => {
    prospects = new RedisProspectService(createFakeRedis());
  });

  it("returns a deterministic prospectId for the same (ownerId, primaryColor, logoUrl)", async () => {
    const a = await resolveProspect(prospects, {
      ownerId: "owner-1",
      name: "Test",
      primaryColor: "#4779FF",
      logoUrl: null,
    });
    const b = await resolveProspect(prospects, {
      ownerId: "owner-1",
      name: "Test",
      primaryColor: "#4779FF",
      logoUrl: null,
    });
    expect(a.id).toBe(b.id);
  });

  it("upserts a Prospect row when no Prospect exists for the seed", async () => {
    const { id } = await resolveProspect(prospects, {
      ownerId: "owner-new",
      name: "Acme",
      primaryColor: "#abcdef",
      logoUrl: "https://example.com/logo.png",
    });
    const prospect = await prospects.get(id);
    expect(prospect).not.toBeNull();
    expect(prospect!.primaryColor).toBe("#abcdef");
    expect(prospect!.logoUrl).toBe("https://example.com/logo.png");
    expect(prospect!.ownerId).toBe("owner-new");
  });

  it("normalises uppercase hex so case differences collapse to the same prospect", async () => {
    const lower = await resolveProspect(prospects, {
      ownerId: "o1",
      name: "X",
      primaryColor: "#aabbcc",
      logoUrl: null,
    });
    const upper = await resolveProspect(prospects, {
      ownerId: "o1",
      name: "X",
      primaryColor: "#AABBCC",
      logoUrl: null,
    });
    expect(lower.id).toBe(upper.id);
  });

  it("uses different prospectIds for different owners with the same colors", async () => {
    const a = await resolveProspect(prospects, {
      ownerId: "owner-a",
      name: "Same",
      primaryColor: "#111111",
      logoUrl: null,
    });
    const b = await resolveProspect(prospects, {
      ownerId: "owner-b",
      name: "Same",
      primaryColor: "#111111",
      logoUrl: null,
    });
    expect(a.id).not.toBe(b.id);
  });

  it("matches the backfill's hashProspectKey output", async () => {
    // The backfill uses scripts/backfill-prospects/hash.ts. Action-resolved
    // prospect ids MUST match so re-running the backfill after action-layer
    // writes is idempotent.
    const { hashProspectKey } = await import(
      "../../../../../scripts/backfill-prospects/hash"
    );
    const expected = hashProspectKey({
      ownerId: "owner-1",
      primaryColor: "#4779ff",
      logoUrl: null,
    });
    const actual = await resolveProspect(prospects, {
      ownerId: "owner-1",
      name: "Anything",
      primaryColor: "#4779FF",
      logoUrl: null,
    });
    expect(actual.id).toBe(expected);
  });

  it("preserves an existing Prospect's createdAt when re-resolving", async () => {
    const first = await resolveProspect(prospects, {
      ownerId: "o-stable",
      name: "First",
      primaryColor: "#abc",
      logoUrl: null,
    });
    const prospect1 = await prospects.get(first.id);
    const originalCreatedAt = prospect1!.createdAt;

    // Re-resolve with a different name (descriptive only).
    const second = await resolveProspect(prospects, {
      ownerId: "o-stable",
      name: "Second",
      primaryColor: "#abc",
      logoUrl: null,
    });
    const prospect2 = await prospects.get(second.id);
    expect(prospect2!.createdAt.getTime()).toBe(originalCreatedAt.getTime());
  });
});
