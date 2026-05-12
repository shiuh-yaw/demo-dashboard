/**
 * Tests for the deterministic brand-resolver shared across every per-kind
 * demo-config mapper. The resolver is the single source of truth for
 * mapping `(ownerId, themed-config)` onto a Brand row — both at action-
 * layer write time and at backfill time — so action-created and
 * backfill-created demos converge on the same `Brand`.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { RedisBrandService } from "@/lib/services/redis/brands";
import type { BrandService } from "@/lib/services/types";

import { resolveBrand } from "../brand-resolver";
import { createFakeRedis } from "../../__tests__/fake-redis";

describe("resolveBrand", () => {
  let brands: BrandService;

  beforeEach(() => {
    brands = new RedisBrandService(createFakeRedis());
  });

  it("returns a deterministic brandId for the same (ownerId, primaryColor, logoUrl)", async () => {
    const a = await resolveBrand(brands, {
      ownerId: "owner-1",
      name: "Test",
      primaryColor: "#4779FF",
      logoUrl: null,
    });
    const b = await resolveBrand(brands, {
      ownerId: "owner-1",
      name: "Test",
      primaryColor: "#4779FF",
      logoUrl: null,
    });
    expect(a.id).toBe(b.id);
  });

  it("upserts a Brand row when no Brand exists for the seed", async () => {
    const { id } = await resolveBrand(brands, {
      ownerId: "owner-new",
      name: "Acme",
      primaryColor: "#abcdef",
      logoUrl: "https://example.com/logo.png",
    });
    const brand = await brands.get(id);
    expect(brand).not.toBeNull();
    expect(brand!.primaryColor).toBe("#abcdef");
    expect(brand!.logoUrl).toBe("https://example.com/logo.png");
    expect(brand!.ownerId).toBe("owner-new");
  });

  it("normalises uppercase hex so case differences collapse to the same brand", async () => {
    const lower = await resolveBrand(brands, {
      ownerId: "o1",
      name: "X",
      primaryColor: "#aabbcc",
      logoUrl: null,
    });
    const upper = await resolveBrand(brands, {
      ownerId: "o1",
      name: "X",
      primaryColor: "#AABBCC",
      logoUrl: null,
    });
    expect(lower.id).toBe(upper.id);
  });

  it("uses different brandIds for different owners with the same colors", async () => {
    const a = await resolveBrand(brands, {
      ownerId: "owner-a",
      name: "Same",
      primaryColor: "#111111",
      logoUrl: null,
    });
    const b = await resolveBrand(brands, {
      ownerId: "owner-b",
      name: "Same",
      primaryColor: "#111111",
      logoUrl: null,
    });
    expect(a.id).not.toBe(b.id);
  });

  it("matches the backfill's hashBrandKey output", async () => {
    // The backfill uses scripts/backfill-brands/hash.ts. Action-resolved
    // brand ids MUST match so re-running the backfill after action-layer
    // writes is idempotent.
    const { hashBrandKey } = await import(
      "../../../../../scripts/backfill-brands/hash"
    );
    const expected = hashBrandKey({
      ownerId: "owner-1",
      primaryColor: "#4779ff",
      logoUrl: null,
    });
    const actual = await resolveBrand(brands, {
      ownerId: "owner-1",
      name: "Anything",
      primaryColor: "#4779FF",
      logoUrl: null,
    });
    expect(actual.id).toBe(expected);
  });

  it("preserves an existing Brand's createdAt when re-resolving", async () => {
    const first = await resolveBrand(brands, {
      ownerId: "o-stable",
      name: "First",
      primaryColor: "#abc",
      logoUrl: null,
    });
    const brand1 = await brands.get(first.id);
    const originalCreatedAt = brand1!.createdAt;

    // Re-resolve with a different name (descriptive only).
    const second = await resolveBrand(brands, {
      ownerId: "o-stable",
      name: "Second",
      primaryColor: "#abc",
      logoUrl: null,
    });
    const brand2 = await brands.get(second.id);
    expect(brand2!.createdAt.getTime()).toBe(originalCreatedAt.getTime());
  });
});
