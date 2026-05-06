/**
 * Parity tests: BrandService contract must hold for both backends.
 *
 * The test matrix runs the same set of behavioural checks against:
 *   - PostgresBrandService backed by an in-memory fake of the
 *     `prisma.brand` delegate.
 *   - RedisBrandService backed by an in-memory RedisClient fake.
 *
 * If a behaviour diverges between the two, the test asserting it fails
 * for at least one backend, blocking merge.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { BrandService, CreateBrandInput } from "@/lib/services/types";
import { PostgresBrandService } from "@/lib/services/postgres/brands";
import { RedisBrandService } from "@/lib/services/redis/brands";
import { createFakePrisma } from "./fake-prisma";
import { createFakeRedis } from "./fake-redis";

interface Backend {
  name: string;
  build: () => BrandService;
}

const backends: Backend[] = [
  {
    name: "postgres",
    build: () => new PostgresBrandService(createFakePrisma()),
  },
  {
    name: "redis",
    build: () => new RedisBrandService(createFakeRedis()),
  },
];

function makeInput(
  overrides: Partial<CreateBrandInput> = {},
): CreateBrandInput {
  return {
    ownerId: "owner-1",
    name: "Acme",
    description: "Acme co",
    primaryColor: "#FF0000",
    secondaryColor: "#00FF00",
    accentColor: "#0000FF",
    logoUrl: "https://example.com/logo.png",
    ...overrides,
  };
}

describe.each(backends)("BrandService parity ($name)", ({ build }) => {
  let svc: BrandService;

  beforeEach(() => {
    svc = build();
  });

  it("creates a brand and returns it with id + timestamps", async () => {
    const created = await svc.create(makeInput());
    expect(created.id).toEqual(expect.any(String));
    expect(created.id.length).toBeGreaterThan(0);
    expect(created.ownerId).toBe("owner-1");
    expect(created.name).toBe("Acme");
    expect(created.description).toBe("Acme co");
    expect(created.primaryColor).toBe("#FF0000");
    expect(created.secondaryColor).toBe("#00FF00");
    expect(created.accentColor).toBe("#0000FF");
    expect(created.logoUrl).toBe("https://example.com/logo.png");
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
  });

  it("treats missing optional fields as null", async () => {
    const created = await svc.create(
      makeInput({
        description: undefined,
        secondaryColor: undefined,
        accentColor: undefined,
        logoUrl: undefined,
      }),
    );
    expect(created.description).toBeNull();
    expect(created.secondaryColor).toBeNull();
    expect(created.accentColor).toBeNull();
    expect(created.logoUrl).toBeNull();
  });

  it("get returns null when the brand does not exist", async () => {
    const found = await svc.get("does-not-exist");
    expect(found).toBeNull();
  });

  it("get returns the brand by id", async () => {
    const created = await svc.create(makeInput());
    const found = await svc.get(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe("Acme");
  });

  it("list returns all brands when no owner filter is provided", async () => {
    await svc.create(makeInput({ ownerId: "owner-1" }));
    await svc.create(makeInput({ ownerId: "owner-2", name: "Beta" }));
    const all = await svc.list();
    expect(all).toHaveLength(2);
  });

  it("list filters by ownerId", async () => {
    await svc.create(makeInput({ ownerId: "owner-1", name: "A" }));
    await svc.create(makeInput({ ownerId: "owner-1", name: "B" }));
    await svc.create(makeInput({ ownerId: "owner-2", name: "C" }));
    const owned = await svc.list({ ownerId: "owner-1" });
    expect(owned.map((b) => b.name).sort()).toEqual(["A", "B"]);
  });

  it("update changes only provided fields and bumps updatedAt", async () => {
    const created = await svc.create(makeInput());
    // Force a measurable gap so updatedAt strictly increases.
    await new Promise((r) => setTimeout(r, 5));
    const updated = await svc.update(created.id, {
      name: "Acme 2",
      logoUrl: null,
    });
    expect(updated.name).toBe("Acme 2");
    expect(updated.logoUrl).toBeNull();
    // unchanged fields
    expect(updated.primaryColor).toBe("#FF0000");
    expect(updated.description).toBe("Acme co");
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created.updatedAt.getTime(),
    );
  });

  it("update throws when the brand does not exist", async () => {
    await expect(
      svc.update("does-not-exist", { name: "x" }),
    ).rejects.toThrow();
  });

  it("delete removes the brand", async () => {
    const created = await svc.create(makeInput());
    await svc.delete(created.id);
    const found = await svc.get(created.id);
    expect(found).toBeNull();
  });

  it("delete throws when the brand does not exist", async () => {
    await expect(svc.delete("does-not-exist")).rejects.toThrow();
  });

  it("delete on one brand leaves others intact", async () => {
    const a = await svc.create(makeInput({ name: "A" }));
    const b = await svc.create(makeInput({ name: "B" }));
    await svc.delete(a.id);
    const remaining = await svc.list();
    expect(remaining.map((r) => r.name)).toEqual(["B"]);
    expect(remaining[0]!.id).toBe(b.id);
  });
});
