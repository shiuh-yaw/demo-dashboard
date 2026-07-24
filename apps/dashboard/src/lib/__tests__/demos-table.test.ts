/**
 * Demos-table query builder: cross-kind list joined to prospect + creator,
 * visibility-scoped, filterable. Pure builder tested here; the async fetch
 * wrapper delegates to it.
 */

import { describe, expect, it } from "vitest";

import { buildDemoTableRows } from "@/lib/demos-table";
import type { DemoConfigRecord, GtmUser, Prospect } from "@/lib/services";

function prospect(over: Partial<Prospect> & { id: string; name: string }): Prospect {
  return {
    ownerId: "sub-owner",
    teamId: null,
    createdById: null,
    status: "ACTIVE",
    description: null,
    companyUrl: null,
    logo: "dynamic",
    logoUrl: null,
    borderRadius: null,
    primaryColor: "#000",
    primaryHoverColor: null,
    secondaryColor: null,
    accentColor: null,
    pageBackground: null,
    background: null,
    foreground: null,
    mutedTextColor: null,
    borderColor: null,
    rowBackground: null,
    rowHoverBackground: null,
    gradientFrom: null,
    gradientTo: null,
    domain: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...over,
  };
}

function demo(over: Partial<DemoConfigRecord> & { id: string }): DemoConfigRecord {
  return {
    kind: "wallet",
    ownerId: "sub-1",
    createdById: "u1",
    name: null,
    description: null,
    prospectId: null,
    isPrimary: false,
    themeOverrides: null,
    config: {},
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
    ...over,
  };
}

function gtmUser(over: Partial<GtmUser> & { id: string; email: string }): GtmUser {
  return {
    dynamicUserId: null,
    displayName: null,
    avatarUrl: null,
    schedulingUrl: null,
    role: "MEMBER",
    deactivatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

const me = { id: "u1", dynamicUserId: "sub-1" };

describe("buildDemoTableRows visibility", () => {
  it("shows only own records when visible is mine-only", () => {
    const rows = buildDemoTableRows(
      me,
      new Set<string>(), // no visible prospects
      [
        demo({ id: "d1", createdById: "u1" }),
        demo({ id: "d2", createdById: "u2", ownerId: "sub-2" }),
      ],
      new Map(),
      new Map(),
    );
    expect(rows.map((r) => r.id)).toEqual(["d1"]);
  });

  it("includes a non-owned demo when its prospect is visible via team", () => {
    const rows = buildDemoTableRows(
      me,
      new Set(["p1"]),
      [demo({ id: "d2", createdById: "u2", ownerId: "sub-2", prospectId: "p1" })],
      new Map([["p1", prospect({ id: "p1", name: "Acme" })]]),
      new Map(),
    );
    expect(rows.map((r) => r.id)).toEqual(["d2"]);
  });

  it('shows everything for "all" (global admin/owner)', () => {
    const rows = buildDemoTableRows(
      me,
      "all",
      [demo({ id: "d1" }), demo({ id: "d2", createdById: "u2", ownerId: "sub-2" })],
      new Map(),
      new Map(),
    );
    expect(rows).toHaveLength(2);
  });
});

describe("buildDemoTableRows joins", () => {
  it("resolves prospect and creator, sorts newest first", () => {
    const rows = buildDemoTableRows(
      me,
      "all",
      [
        demo({ id: "d1", createdAt: new Date("2026-02-01"), prospectId: "p1" }),
        demo({ id: "d2", createdAt: new Date("2026-03-01"), createdById: null, ownerId: "orphan" }),
      ],
      new Map([["p1", prospect({ id: "p1", name: "Acme", domain: "acme.com" })]]),
      new Map([["u1", gtmUser({ id: "u1", email: "me@x.com", displayName: "Me" })]]),
    );
    expect(rows[0]!.id).toBe("d2"); // newest first
    const d1 = rows.find((r) => r.id === "d1")!;
    expect(d1.prospect).toMatchObject({ id: "p1", name: "Acme", domain: "acme.com" });
    expect(d1.creator).toMatchObject({ id: "u1", displayName: "Me" });
    const d2 = rows.find((r) => r.id === "d2")!;
    expect(d2.prospect).toBeNull();
    expect(d2.creator).toBeNull();
  });
});

describe("buildDemoTableRows filters", () => {
  const configs = [
    demo({ id: "d1", kind: "wallet", createdById: "u1", prospectId: "p1", createdAt: new Date("2026-01-10") }),
    demo({ id: "d2", kind: "trade", createdById: "u2", ownerId: "sub-2", prospectId: "p2", createdAt: new Date("2026-02-10") }),
    demo({ id: "d3", kind: "wallet", createdById: "u2", ownerId: "sub-2", prospectId: null, createdAt: new Date("2026-03-10") }),
  ];
  const prospects = new Map([
    ["p1", prospect({ id: "p1", name: "Acme" })],
    ["p2", prospect({ id: "p2", name: "Globex" })],
  ]);

  it("filters by kind", () => {
    const rows = buildDemoTableRows(me, "all", configs, prospects, new Map(), { kind: "wallet" });
    expect(rows.map((r) => r.id).sort()).toEqual(["d1", "d3"]);
  });

  it("filters by creatorId", () => {
    const rows = buildDemoTableRows(me, "all", configs, prospects, new Map(), { creatorId: "u2" });
    expect(rows.map((r) => r.id).sort()).toEqual(["d2", "d3"]);
  });

  it("filters by prospectId", () => {
    const rows = buildDemoTableRows(me, "all", configs, prospects, new Map(), { prospectId: "p2" });
    expect(rows.map((r) => r.id)).toEqual(["d2"]);
  });

  it("filters by date range", () => {
    const rows = buildDemoTableRows(me, "all", configs, prospects, new Map(), {
      createdAfter: new Date("2026-02-01"),
      createdBefore: new Date("2026-02-28"),
    });
    expect(rows.map((r) => r.id)).toEqual(["d2"]);
  });

  it("search matches prospect name case-insensitively and drops unbound demos", () => {
    const rows = buildDemoTableRows(me, "all", configs, prospects, new Map(), { search: "glob" });
    expect(rows.map((r) => r.id)).toEqual(["d2"]);
  });
});
