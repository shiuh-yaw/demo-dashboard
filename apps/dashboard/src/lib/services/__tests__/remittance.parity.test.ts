/**
 * Parity tests: RemittanceConfigService contract must hold for both backends.
 *
 * The test matrix runs the same set of behavioural checks against:
 *   - PostgresRemittanceConfigService backed by an in-memory fake of the
 *     `prisma.remittanceConfig` delegate.
 *   - RedisRemittanceConfigService backed by an in-memory RedisClient fake.
 *
 * If a behaviour diverges between the two, the test asserting it fails for
 * at least one backend, blocking merge. Same pattern as the brand parity
 * suite (`brands.parity.test.ts`) and the transaction parity suite.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { PostgresRemittanceConfigService } from "@/lib/services/postgres/remittance";
import { RedisRemittanceConfigService } from "@/lib/services/redis/remittance";
import type {
  CreateRemittanceConfigInput,
  RemittanceConfigService,
} from "@/lib/services/types";

import { createFakeRedis } from "./fake-redis";
import { createFakeRemittancePrisma } from "./fake-prisma-remittance";

interface Backend {
  name: string;
  build: () => RemittanceConfigService;
}

const backends: Backend[] = [
  {
    name: "postgres",
    build: () =>
      new PostgresRemittanceConfigService(createFakeRemittancePrisma()),
  },
  {
    name: "redis",
    build: () => new RedisRemittanceConfigService(createFakeRedis()),
  },
];

function makeInput(
  overrides: Partial<CreateRemittanceConfigInput> = {},
): CreateRemittanceConfigInput {
  return {
    ownerId: "owner-1",
    name: "US to BR",
    description: "Stablecoin remittance",
    brandId: "brand-1",
    config: {
      theme: { primaryColor: "#1a56db", secondaryColor: "#1e40af" },
      branding: { logoUrl: "https://example.com/logo.png" },
    },
    ...overrides,
  };
}

describe.each(backends)(
  "RemittanceConfigService parity ($name)",
  ({ build }) => {
    let svc: RemittanceConfigService;

    beforeEach(() => {
      svc = build();
    });

    it("creates a record with id + timestamps + all input fields", async () => {
      const created = await svc.create(makeInput());
      expect(created.id).toEqual(expect.any(String));
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.ownerId).toBe("owner-1");
      expect(created.name).toBe("US to BR");
      expect(created.description).toBe("Stablecoin remittance");
      expect(created.brandId).toBe("brand-1");
      expect(created.config).toEqual({
        theme: { primaryColor: "#1a56db", secondaryColor: "#1e40af" },
        branding: { logoUrl: "https://example.com/logo.png" },
      });
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it("treats missing description as null", async () => {
      const created = await svc.create(makeInput({ description: undefined }));
      expect(created.description).toBeNull();
    });

    it("treats explicit null description as null", async () => {
      const created = await svc.create(makeInput({ description: null }));
      expect(created.description).toBeNull();
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
      expect(found!.name).toBe("US to BR");
    });

    it("list returns all records when no filter is provided", async () => {
      await svc.create(makeInput({ ownerId: "owner-1", brandId: "brand-1" }));
      await svc.create(
        makeInput({ ownerId: "owner-2", brandId: "brand-2", name: "AR to US" }),
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

    it("list filters by brandId", async () => {
      await svc.create(makeInput({ brandId: "brand-1", name: "A" }));
      await svc.create(makeInput({ brandId: "brand-2", name: "B" }));
      const branded = await svc.list({ brandId: "brand-1" });
      expect(branded).toHaveLength(1);
      expect(branded[0]!.name).toBe("A");
    });

    it("list combines ownerId and brandId filters", async () => {
      await svc.create(
        makeInput({ ownerId: "owner-1", brandId: "brand-1", name: "match" }),
      );
      await svc.create(
        makeInput({ ownerId: "owner-1", brandId: "brand-2", name: "miss-1" }),
      );
      await svc.create(
        makeInput({ ownerId: "owner-2", brandId: "brand-1", name: "miss-2" }),
      );
      const filtered = await svc.list({
        ownerId: "owner-1",
        brandId: "brand-1",
      });
      expect(filtered.map((r) => r.name)).toEqual(["match"]);
    });

    it("update changes only provided fields and bumps updatedAt", async () => {
      const created = await svc.create(makeInput());
      // Force a measurable gap so updatedAt strictly increases.
      await new Promise((r) => setTimeout(r, 5));
      const updated = await svc.update(created.id, {
        name: "BR to US",
        description: null,
      });
      expect(updated.name).toBe("BR to US");
      expect(updated.description).toBeNull();
      // unchanged fields
      expect(updated.brandId).toBe("brand-1");
      expect(updated.config).toEqual(created.config);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime(),
      );
    });

    it("update can change brandId (re-link to a different Brand)", async () => {
      const created = await svc.create(makeInput());
      const updated = await svc.update(created.id, { brandId: "brand-99" });
      expect(updated.brandId).toBe("brand-99");
    });

    it("update can replace the embedded config payload", async () => {
      const created = await svc.create(makeInput());
      const newPayload = { theme: { primaryColor: "#000000" } };
      const updated = await svc.update(created.id, { config: newPayload });
      expect(updated.config).toEqual(newPayload);
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

    it("upsertWithId preserves createdAt and bumps updatedAt on the second call", async () => {
      const first = await svc.upsertWithId(
        "legacy_id_2",
        makeInput({ name: "A" }),
      );
      await new Promise((r) => setTimeout(r, 5));
      const second = await svc.upsertWithId(
        "legacy_id_2",
        makeInput({ name: "B", brandId: "brand-2" }),
      );
      expect(second.id).toBe("legacy_id_2");
      expect(second.name).toBe("B");
      expect(second.brandId).toBe("brand-2");
      expect(second.createdAt.getTime()).toBe(first.createdAt.getTime());
      expect(second.updatedAt.getTime()).toBeGreaterThanOrEqual(
        first.updatedAt.getTime(),
      );
      const all = await svc.list();
      expect(all).toHaveLength(1);
    });
  },
);
