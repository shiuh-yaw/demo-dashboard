/**
 * Parity tests: DemoConfigService contract must hold for both backends.
 *
 * The unified `DemoConfig` table replaces what would otherwise be one
 * Postgres table per demo type (earn, wallet, trade, visa-direct,
 * checkout, remittance). One service, one contract, two backends:
 *
 *   - PostgresDemoConfigService backed by an in-memory fake of the
 *     `prisma.demoConfig` delegate.
 *   - RedisDemoConfigService backed by an in-memory RedisClient fake.
 *
 * If a behaviour diverges between the two, the test asserting it fails
 * for at least one backend, blocking merge. Same pattern as
 * `remittance.parity.test.ts` etc.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { PostgresDemoConfigService } from "@/lib/services/postgres/demo-configs";
import { RedisDemoConfigService } from "@/lib/services/redis/demo-configs";
import type {
  CreateDemoConfigInput,
  DemoConfigKind,
  DemoConfigService,
} from "@/lib/services/types";

import { createFakeRedis } from "./fake-redis";
import { createFakeDemoConfigPrisma } from "./fake-prisma-demo-configs";

interface Backend {
  name: string;
  build: () => DemoConfigService;
}

const backends: Backend[] = [
  {
    name: "postgres",
    build: () => new PostgresDemoConfigService(createFakeDemoConfigPrisma()),
  },
  {
    name: "redis",
    build: () => new RedisDemoConfigService(createFakeRedis()),
  },
];

function makeInput(
  overrides: Partial<CreateDemoConfigInput> = {},
): CreateDemoConfigInput {
  return {
    kind: "earn",
    ownerId: "owner-1",
    name: "Earn USDC",
    description: "Earn demo with USDC vaults",
    prospectId: "prospect-1",
    themeOverrides: null,
    config: { vault: "aave-usdc", apy: "4.5" },
    ...overrides,
  };
}

describe.each(backends)("DemoConfigService parity ($name)", ({ build }) => {
  let svc: DemoConfigService;

  beforeEach(() => {
    svc = build();
  });

  it("creates a record with id + timestamps + all input fields", async () => {
    const created = await svc.create(makeInput());
    expect(created.id).toEqual(expect.any(String));
    expect(created.id.length).toBeGreaterThan(0);
    expect(created.kind).toBe("earn");
    expect(created.ownerId).toBe("owner-1");
    expect(created.name).toBe("Earn USDC");
    expect(created.description).toBe("Earn demo with USDC vaults");
    expect(created.prospectId).toBe("prospect-1");
    expect(created.themeOverrides).toBeNull();
    expect(created.config).toEqual({ vault: "aave-usdc", apy: "4.5" });
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
  });

  it("defaults createdById to null and round-trips an explicit value", async () => {
    const created = await svc.create(makeInput());
    expect(created.createdById).toBeNull();
    const withCreator = await svc.create(
      makeInput({ createdById: "user-7" }),
    );
    expect(withCreator.createdById).toBe("user-7");
    const fetched = await svc.get(withCreator.id);
    expect(fetched!.createdById).toBe("user-7");
  });

  it("treats missing description as null", async () => {
    const created = await svc.create(makeInput({ description: undefined }));
    expect(created.description).toBeNull();
  });

  it("treats explicit null description as null", async () => {
    const created = await svc.create(makeInput({ description: null }));
    expect(created.description).toBeNull();
  });

  it("treats missing name as null", async () => {
    const created = await svc.create(makeInput({ name: undefined }));
    expect(created.name).toBeNull();
    const fetched = await svc.get(created.id);
    expect(fetched!.name).toBeNull();
  });

  it("treats explicit null name as null", async () => {
    const created = await svc.create(makeInput({ name: null }));
    expect(created.name).toBeNull();
  });

  it("round-trips a populated themeOverrides object", async () => {
    const overrides = { primaryColor: "#ff00ff", borderRadius: "lg" };
    const created = await svc.create(makeInput({ themeOverrides: overrides }));
    expect(created.themeOverrides).toEqual(overrides);
    const fetched = await svc.get(created.id);
    expect(fetched!.themeOverrides).toEqual(overrides);
  });

  it("round-trips themeOverrides null when omitted from input", async () => {
    const created = await svc.create(
      makeInput({ themeOverrides: undefined }),
    );
    expect(created.themeOverrides).toBeNull();
  });

  it("round-trips an arbitrarily nested config Json payload", async () => {
    const nested = {
      providers: ["alfredpay", "blindpay"],
      defaults: { currency: "USD", rails: { onramp: "card", offramp: "ach" } },
      flags: { showFees: true, demoMode: null },
    };
    const created = await svc.create(makeInput({ config: nested }));
    expect(created.config).toEqual(nested);
    const fetched = await svc.get(created.id);
    expect(fetched!.config).toEqual(nested);
  });

  it("get returns null when the record does not exist", async () => {
    const found = await svc.get("does-not-exist");
    expect(found).toBeNull();
  });

  it("get returns the record by id", async () => {
    const created = await svc.create(makeInput());
    const found = await svc.get(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe("Earn USDC");
    expect(found!.kind).toBe("earn");
  });

  // Cover each `kind` discriminator end-to-end.
  const kinds: DemoConfigKind[] = [
    "earn",
    "wallet",
    "trade",
    "visa-direct",
    "checkout",
    "remittance",
  ];
  for (const kind of kinds) {
    it(`accepts kind=${kind} on create + round-trips on get`, async () => {
      const created = await svc.create(makeInput({ kind, name: kind }));
      expect(created.kind).toBe(kind);
      const fetched = await svc.get(created.id);
      expect(fetched!.kind).toBe(kind);
    });
  }

  it("rejects an unknown kind at the service boundary", async () => {
    await expect(
      svc.create(
        makeInput({ kind: "not-a-real-kind" as unknown as DemoConfigKind }),
      ),
    ).rejects.toThrow();
  });

  it("list returns all records when no filter is provided", async () => {
    await svc.create(makeInput({ kind: "earn", name: "A" }));
    await svc.create(
      makeInput({ kind: "wallet", name: "B", ownerId: "owner-2" }),
    );
    const all = await svc.list();
    expect(all).toHaveLength(2);
  });

  it("list filters by ownerId", async () => {
    await svc.create(makeInput({ ownerId: "owner-1", name: "A" }));
    await svc.create(makeInput({ ownerId: "owner-1", name: "B" }));
    await svc.create(makeInput({ ownerId: "owner-2", name: "C" }));
    const owned = await svc.list({ ownerId: "owner-1" });
    expect(owned.map((r) => r.name).sort()).toEqual(["A", "B"]);
  });

  it("list filters by kind", async () => {
    await svc.create(makeInput({ kind: "earn", name: "earn-1" }));
    await svc.create(makeInput({ kind: "wallet", name: "wallet-1" }));
    await svc.create(makeInput({ kind: "earn", name: "earn-2" }));
    const earns = await svc.list({ kind: "earn" });
    expect(earns.map((r) => r.name).sort()).toEqual(["earn-1", "earn-2"]);
  });

  it("list filters by prospectId", async () => {
    await svc.create(makeInput({ prospectId: "prospect-1", name: "A" }));
    await svc.create(makeInput({ prospectId: "prospect-2", name: "B" }));
    const branded = await svc.list({ prospectId: "prospect-1" });
    expect(branded).toHaveLength(1);
    expect(branded[0]!.name).toBe("A");
  });

  it("list combines ownerId and kind filters", async () => {
    await svc.create(
      makeInput({ ownerId: "owner-1", kind: "earn", name: "match" }),
    );
    await svc.create(
      makeInput({ ownerId: "owner-1", kind: "wallet", name: "miss-1" }),
    );
    await svc.create(
      makeInput({ ownerId: "owner-2", kind: "earn", name: "miss-2" }),
    );
    const filtered = await svc.list({ ownerId: "owner-1", kind: "earn" });
    expect(filtered.map((r) => r.name)).toEqual(["match"]);
  });

  it("update changes only provided fields and bumps updatedAt", async () => {
    const created = await svc.create(makeInput());
    await new Promise((r) => setTimeout(r, 5));
    const updated = await svc.update(created.id, {
      name: "Earn USDT",
      description: null,
    });
    expect(updated.name).toBe("Earn USDT");
    expect(updated.description).toBeNull();
    expect(updated.prospectId).toBe("prospect-1");
    expect(updated.config).toEqual(created.config);
    expect(updated.kind).toBe("earn"); // kind is immutable
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created.updatedAt.getTime(),
    );
  });

  it("update can change prospectId (re-link to a different Prospect)", async () => {
    const created = await svc.create(makeInput());
    const updated = await svc.update(created.id, { prospectId: "prospect-99" });
    expect(updated.prospectId).toBe("prospect-99");
  });

  it("update can replace the config payload", async () => {
    const created = await svc.create(makeInput());
    const newPayload = { vault: "compound-usdc", apy: "3.2" };
    const updated = await svc.update(created.id, { config: newPayload });
    expect(updated.config).toEqual(newPayload);
  });

  it("update can set themeOverrides to a value and back to null", async () => {
    const created = await svc.create(makeInput());
    const withOverride = await svc.update(created.id, {
      themeOverrides: { primaryColor: "#00ff00" },
    });
    expect(withOverride.themeOverrides).toEqual({ primaryColor: "#00ff00" });
    const cleared = await svc.update(created.id, { themeOverrides: null });
    expect(cleared.themeOverrides).toBeNull();
  });

  it("update throws when the record does not exist", async () => {
    await expect(
      svc.update("does-not-exist", { name: "x" }),
    ).rejects.toThrow();
  });

  it("delete removes the record", async () => {
    const created = await svc.create(makeInput());
    await svc.delete(created.id);
    const found = await svc.get(created.id);
    expect(found).toBeNull();
  });

  it("delete throws when the record does not exist", async () => {
    await expect(svc.delete("does-not-exist")).rejects.toThrow();
  });

  it("delete on one record leaves others intact", async () => {
    const a = await svc.create(makeInput({ name: "A" }));
    const b = await svc.create(makeInput({ name: "B" }));
    await svc.delete(a.id);
    const remaining = await svc.list();
    expect(remaining.map((r) => r.name)).toEqual(["B"]);
    expect(remaining[0]!.id).toBe(b.id);
  });

  it("upsertWithId creates with the provided id when absent", async () => {
    const created = await svc.upsertWithId("legacy_id_1", makeInput());
    expect(created.id).toBe("legacy_id_1");
    const found = await svc.get("legacy_id_1");
    expect(found).not.toBeNull();
    expect(found!.id).toBe("legacy_id_1");
  });

  it("upsertWithId preserves createdAt and bumps updatedAt on second call", async () => {
    const first = await svc.upsertWithId(
      "legacy_id_2",
      makeInput({ name: "A" }),
    );
    await new Promise((r) => setTimeout(r, 5));
    const second = await svc.upsertWithId(
      "legacy_id_2",
      makeInput({ name: "B", prospectId: "prospect-2" }),
    );
    expect(second.id).toBe("legacy_id_2");
    expect(second.name).toBe("B");
    expect(second.prospectId).toBe("prospect-2");
    expect(second.createdAt.getTime()).toBe(first.createdAt.getTime());
    expect(second.updatedAt.getTime()).toBeGreaterThanOrEqual(
      first.updatedAt.getTime(),
    );
    const all = await svc.list();
    expect(all).toHaveLength(1);
  });
});
