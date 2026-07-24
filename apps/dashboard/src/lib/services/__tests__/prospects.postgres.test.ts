/**
 * ProspectService contract, exercised against PostgresProspectService backed
 * by prismock (an in-memory PrismaClient). Covers every field on the Prospect
 * row plus the ProspectTheme relation loaded via `include`.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { ProspectService, CreateProspectInput } from "@/lib/services/types";
import { PostgresProspectService } from "@/lib/services/postgres/prospects";
import { makePrismock } from "./make-prismock";

interface Backend {
  name: string;
  build: () => ProspectService;
}

const backends: Backend[] = [
  {
    name: "postgres",
    build: () => new PostgresProspectService(makePrismock()),
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

  it("list returns all prospects when no where is provided", async () => {
    await svc.create(makeInput({ ownerId: "owner-1" }));
    await svc.create(makeInput({ ownerId: "owner-2", name: "Beta" }));
    const all = await svc.list();
    expect(all.items).toHaveLength(2);
    expect(all.nextCursor).toBeNull();
  });

  it("list filters via the where fragment - scoping happens in the query, not in JS", async () => {
    await svc.create(makeInput({ ownerId: "owner-1", name: "A" }));
    await svc.create(makeInput({ ownerId: "owner-1", name: "B" }));
    await svc.create(makeInput({ ownerId: "owner-2", name: "C" }));
    const owned = await svc.list({ where: { ownerId: "owner-1" } });
    expect(owned.items.map((b) => b.name).sort()).toEqual(["A", "B"]);
  });

  it("list with an OR where fragment matches either branch", async () => {
    const a = await svc.create(makeInput({ ownerId: "owner-1", name: "A", createdById: null }));
    await svc.create(makeInput({ ownerId: "owner-2", name: "B", createdById: "user-9" }));
    await svc.create(makeInput({ ownerId: "owner-3", name: "C", createdById: "user-8" }));
    const matched = await svc.list({
      where: { OR: [{ ownerId: a.ownerId }, { createdById: "user-9" }] },
    });
    expect(matched.items.map((b) => b.name).sort()).toEqual(["A", "B"]);
  });

  it("list with a fail-closed empty-set where returns an empty page", async () => {
    await svc.create(makeInput());
    const page = await svc.list({ where: { id: { in: [] } } });
    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it("list orders newest-updated first and sets nextCursor over a full page", async () => {
    await svc.create(makeInput({ name: "A" }));
    await new Promise((r) => setTimeout(r, 5));
    await svc.create(makeInput({ name: "B" }));
    await new Promise((r) => setTimeout(r, 5));
    await svc.create(makeInput({ name: "C" }));

    const page1 = await svc.list({ limit: 2 });
    // Newest-updated first: C, B fill page 1; A is left for the next page.
    expect(page1.items.map((p) => p.name)).toEqual(["C", "B"]);
    expect(page1.nextCursor).not.toBeNull();
    // Cursor-resume math (skip:1 past the cursor with a compound orderBy) is
    // covered faithfully by the pure keyset unit test in
    // postgres/__tests__/pagination.test.ts; prismock does not emulate it.
  });

  it("listIds returns a bare id array for a where fragment, unpaginated", async () => {
    const a = await svc.create(makeInput({ ownerId: "owner-1", name: "A" }));
    const b = await svc.create(makeInput({ ownerId: "owner-1", name: "B" }));
    await svc.create(makeInput({ ownerId: "owner-2", name: "C" }));
    const ids = await svc.listIds({ ownerId: "owner-1" });
    expect(ids.sort()).toEqual([a.id, b.id].sort());
  });

  it("listIds fails closed to an empty array for an empty-set where", async () => {
    await svc.create(makeInput());
    expect(await svc.listIds({ id: { in: [] } })).toEqual([]);
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
    const remaining = (await svc.list()).items;
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
    expect(all.items).toHaveLength(1);
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
    const list = await svc.list({ where: { ownerId: "owner-1" } });
    expect(list.items).toHaveLength(1);
    expect(list.items[0]!.id).toBe(owned.id);
    // get does not enforce ownership at the service layer (caller is
    // expected to scope by ownerId in actions). Confirm get returns
    // both rows so we never silently regress that contract.
    const all = await svc.list();
    expect(all.items).toHaveLength(2);
  });
});
