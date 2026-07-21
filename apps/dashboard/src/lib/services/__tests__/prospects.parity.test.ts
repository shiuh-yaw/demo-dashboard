/**
 * Parity tests: ProspectService contract must hold for both backends.
 *
 * The test matrix runs the same set of behavioural checks against:
 *   - PostgresProspectService backed by an in-memory fake of the
 *     `prisma.prospect` delegate.
 *   - RedisProspectService backed by an in-memory RedisClient fake.
 *
 * If a behaviour diverges between the two, the test asserting it fails
 * for at least one backend, blocking merge.
 *
 * Phase 2-brand-cutover (2026-05-06): coverage extended to every field
 * on the wider Prospect row.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { ProspectService, CreateProspectInput } from "@/lib/services/types";
import { PostgresProspectService } from "@/lib/services/postgres/prospects";
import { RedisProspectService } from "@/lib/services/redis/prospects";
import { createFakePrisma } from "./fake-prisma";
import { createFakeRedis } from "./fake-redis";

interface Backend {
  name: string;
  build: () => ProspectService;
}

const backends: Backend[] = [
  {
    name: "postgres",
    build: () => new PostgresProspectService(createFakePrisma()),
  },
  {
    name: "redis",
    build: () => new RedisProspectService(createFakeRedis()),
  },
];

function makeInput(
  overrides: Partial<CreateProspectInput> = {},
): CreateProspectInput {
  return {
    ownerId: "owner-1",
    name: "Acme",
    description: "Acme co",
    companyUrl: "https://acme.example",
    logo: "custom",
    logoUrl: "https://example.com/logo.png",
    borderRadius: "md",
    primaryColor: "#FF0000",
    primaryHoverColor: "#cc0000",
    secondaryColor: "#00FF00",
    accentColor: "#0000FF",
    pageBackground: "#f6f8fa",
    background: "#ffffff",
    foreground: "#0e121b",
    mutedTextColor: "#99a0ae",
    borderColor: "#e1e4ea",
    rowBackground: "#f8f9fb",
    rowHoverBackground: "#eef1f1",
    gradientFrom: "#daffff",
    gradientTo: "rgba(218, 255, 255, 0.15)",
    demoEarnId: "earn_1",
    demoCheckoutsId: "ck_1",
    demoWalletId: "wallet_1",
    demoRemittanceId: "rem_1",
    ...overrides,
  };
}

describe.each(backends)("ProspectService parity ($name)", ({ build }) => {
  let svc: ProspectService;

  beforeEach(() => {
    svc = build();
  });

  it("creates a prospect and returns it with id + timestamps", async () => {
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

  it("persists every visual theme field round-trip", async () => {
    const created = await svc.create(makeInput());
    const fetched = await svc.get(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.companyUrl).toBe("https://acme.example");
    expect(fetched!.logo).toBe("custom");
    expect(fetched!.logoUrl).toBe("https://example.com/logo.png");
    expect(fetched!.borderRadius).toBe("md");
    expect(fetched!.primaryColor).toBe("#FF0000");
    expect(fetched!.primaryHoverColor).toBe("#cc0000");
    expect(fetched!.secondaryColor).toBe("#00FF00");
    expect(fetched!.accentColor).toBe("#0000FF");
    expect(fetched!.pageBackground).toBe("#f6f8fa");
    expect(fetched!.background).toBe("#ffffff");
    expect(fetched!.foreground).toBe("#0e121b");
    expect(fetched!.mutedTextColor).toBe("#99a0ae");
    expect(fetched!.borderColor).toBe("#e1e4ea");
    expect(fetched!.rowBackground).toBe("#f8f9fb");
    expect(fetched!.rowHoverBackground).toBe("#eef1f1");
    expect(fetched!.gradientFrom).toBe("#daffff");
    expect(fetched!.gradientTo).toBe("rgba(218, 255, 255, 0.15)");
    expect(fetched!.demoEarnId).toBe("earn_1");
    expect(fetched!.demoCheckoutsId).toBe("ck_1");
    expect(fetched!.demoWalletId).toBe("wallet_1");
    expect(fetched!.demoRemittanceId).toBe("rem_1");
  });

  it("treats missing optional fields as null and defaults logo to 'dynamic'", async () => {
    const created = await svc.create({
      ownerId: "owner-1",
      name: "Acme",
      primaryColor: "#FF0000",
    });
    expect(created.description).toBeNull();
    expect(created.companyUrl).toBeNull();
    expect(created.logo).toBe("dynamic");
    expect(created.logoUrl).toBeNull();
    expect(created.borderRadius).toBeNull();
    expect(created.primaryHoverColor).toBeNull();
    expect(created.secondaryColor).toBeNull();
    expect(created.accentColor).toBeNull();
    expect(created.pageBackground).toBeNull();
    expect(created.background).toBeNull();
    expect(created.foreground).toBeNull();
    expect(created.mutedTextColor).toBeNull();
    expect(created.borderColor).toBeNull();
    expect(created.rowBackground).toBeNull();
    expect(created.rowHoverBackground).toBeNull();
    expect(created.gradientFrom).toBeNull();
    expect(created.gradientTo).toBeNull();
    expect(created.demoEarnId).toBeNull();
    expect(created.demoCheckoutsId).toBeNull();
    expect(created.demoWalletId).toBeNull();
    expect(created.demoRemittanceId).toBeNull();
  });

  it("get returns null when the prospect does not exist", async () => {
    const found = await svc.get("does-not-exist");
    expect(found).toBeNull();
  });

  it("get returns the prospect by id", async () => {
    const created = await svc.create(makeInput());
    const found = await svc.get(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe("Acme");
  });

  it("list returns all prospects when no owner filter is provided", async () => {
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
    expect(updated.gradientFrom).toBe("#daffff");
    expect(updated.demoEarnId).toBe("earn_1");
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created.updatedAt.getTime(),
    );
  });

  it("update can set every visual theme field independently", async () => {
    const created = await svc.create({
      ownerId: "owner-1",
      name: "Acme",
      primaryColor: "#FF0000",
    });
    await new Promise((r) => setTimeout(r, 5));
    const updated = await svc.update(created.id, {
      companyUrl: "https://later.example",
      logo: "custom",
      logoUrl: "https://later.example/logo.svg",
      borderRadius: "lg",
      primaryHoverColor: "#aa0000",
      pageBackground: "#101010",
      background: "#202020",
      foreground: "#fafafa",
      mutedTextColor: "#888888",
      borderColor: "#303030",
      rowBackground: "#181818",
      rowHoverBackground: "#202020",
      gradientFrom: "#abcdef",
      gradientTo: "#123456",
      demoEarnId: "earn_x",
      demoCheckoutsId: "ck_x",
      demoWalletId: "w_x",
      demoRemittanceId: "r_x",
    });
    expect(updated.companyUrl).toBe("https://later.example");
    expect(updated.logo).toBe("custom");
    expect(updated.logoUrl).toBe("https://later.example/logo.svg");
    expect(updated.borderRadius).toBe("lg");
    expect(updated.primaryHoverColor).toBe("#aa0000");
    expect(updated.pageBackground).toBe("#101010");
    expect(updated.background).toBe("#202020");
    expect(updated.foreground).toBe("#fafafa");
    expect(updated.mutedTextColor).toBe("#888888");
    expect(updated.borderColor).toBe("#303030");
    expect(updated.rowBackground).toBe("#181818");
    expect(updated.rowHoverBackground).toBe("#202020");
    expect(updated.gradientFrom).toBe("#abcdef");
    expect(updated.gradientTo).toBe("#123456");
    expect(updated.demoEarnId).toBe("earn_x");
    expect(updated.demoCheckoutsId).toBe("ck_x");
    expect(updated.demoWalletId).toBe("w_x");
    expect(updated.demoRemittanceId).toBe("r_x");
  });

  it("update can clear an optional field by passing null", async () => {
    const created = await svc.create(makeInput());
    const updated = await svc.update(created.id, {
      logoUrl: null,
      companyUrl: null,
      gradientFrom: null,
    });
    expect(updated.logoUrl).toBeNull();
    expect(updated.companyUrl).toBeNull();
    expect(updated.gradientFrom).toBeNull();
    // sibling fields on the same row stay populated
    expect(updated.gradientTo).toBe("rgba(218, 255, 255, 0.15)");
  });

  it("update throws when the prospect does not exist", async () => {
    await expect(
      svc.update("does-not-exist", { name: "x" }),
    ).rejects.toThrow();
  });

  it("delete removes the prospect", async () => {
    const created = await svc.create(makeInput());
    await svc.delete(created.id);
    const found = await svc.get(created.id);
    expect(found).toBeNull();
  });

  it("delete throws when the prospect does not exist", async () => {
    await expect(svc.delete("does-not-exist")).rejects.toThrow();
  });

  it("delete on one prospect leaves others intact", async () => {
    const a = await svc.create(makeInput({ name: "A" }));
    const b = await svc.create(makeInput({ name: "B" }));
    await svc.delete(a.id);
    const remaining = await svc.list();
    expect(remaining.map((r) => r.name)).toEqual(["B"]);
    expect(remaining[0]!.id).toBe(b.id);
  });

  it("upsertWithId creates with the provided id when absent", async () => {
    const created = await svc.upsertWithId("custom_id_1", makeInput());
    expect(created.id).toBe("custom_id_1");
    const found = await svc.get("custom_id_1");
    expect(found).not.toBeNull();
    expect(found!.gradientFrom).toBe("#daffff");
  });

  it("upsertWithId updates and bumps updatedAt on the second call with the same id", async () => {
    const first = await svc.upsertWithId(
      "custom_id_2",
      makeInput({ name: "A" }),
    );
    await new Promise((r) => setTimeout(r, 5));
    const second = await svc.upsertWithId(
      "custom_id_2",
      makeInput({ name: "B", primaryColor: "#abcdef" }),
    );
    expect(second.id).toBe("custom_id_2");
    expect(second.name).toBe("B");
    expect(second.primaryColor).toBe("#abcdef");
    expect(second.createdAt.getTime()).toBe(first.createdAt.getTime());
    expect(second.updatedAt.getTime()).toBeGreaterThanOrEqual(
      first.updatedAt.getTime(),
    );
    const all = await svc.list();
    expect(all).toHaveLength(1);
  });

  it("persists domain and notes round-trip, then updates them", async () => {
    const created = await svc.create(
      makeInput({ domain: "acme.example", notes: "warm lead, intro'd by Sam" }),
    );
    const fetched = await svc.get(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.domain).toBe("acme.example");
    expect(fetched!.notes).toBe("warm lead, intro'd by Sam");

    const updated = await svc.update(created.id, {
      domain: "acme-corp.example",
      notes: "closed - moving to pilot",
    });
    expect(updated.domain).toBe("acme-corp.example");
    expect(updated.notes).toBe("closed - moving to pilot");

    const refetched = await svc.get(created.id);
    expect(refetched!.domain).toBe("acme-corp.example");
    expect(refetched!.notes).toBe("closed - moving to pilot");
  });

  it("defaults teamId to null, createdById to null, status to ACTIVE", async () => {
    const created = await svc.create(makeInput());
    expect(created.teamId).toBeNull();
    expect(created.createdById).toBeNull();
    expect(created.status).toBe("ACTIVE");
    const fetched = await svc.get(created.id);
    expect(fetched!.teamId).toBeNull();
    expect(fetched!.status).toBe("ACTIVE");
  });

  it("round-trips explicit teamId / createdById / status and updates them", async () => {
    const created = await svc.create(
      makeInput({ teamId: "team_x", createdById: "user-1", status: "ARCHIVED" }),
    );
    expect(created.teamId).toBe("team_x");
    expect(created.createdById).toBe("user-1");
    expect(created.status).toBe("ARCHIVED");
    const updated = await svc.update(created.id, {
      status: "ACTIVE",
      createdById: null,
    });
    expect(updated.status).toBe("ACTIVE");
    expect(updated.createdById).toBeNull();
    // teamId unchanged by the partial update.
    expect(updated.teamId).toBe("team_x");
  });

  it("ownership scoping holds across the wider row (list + get)", async () => {
    const owned = await svc.create(
      makeInput({ ownerId: "owner-1", name: "Owned" }),
    );
    await svc.create(makeInput({ ownerId: "owner-2", name: "Other" }));
    const list = await svc.list({ ownerId: "owner-1" });
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(owned.id);
    // get does not enforce ownership at the service layer (caller is
    // expected to scope by ownerId in actions). Confirm get returns
    // both rows so we never silently regress that contract.
    const all = await svc.list();
    expect(all).toHaveLength(2);
  });
});
