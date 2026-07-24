/**
 * Unit coverage for the demo-detail two-tier scoping helpers. Tier-2 detail
 * rows must exclude prospects outside the viewer's visibility even though
 * those prospects still count toward the Tier-1 aggregate (that side is
 * covered in ../../services/__tests__/analytics.test.ts).
 */

import { describe, expect, it } from "vitest";
import {
  computeKindScopes,
  isConfigurableKind,
  prospectOwnedBy,
  visibleKindConfigs,
} from "../demo-kind";

describe("isConfigurableKind", () => {
  it("accepts kinds with a prospect-hub creation path", () => {
    expect(isConfigurableKind("wallet")).toBe(true);
    expect(isConfigurableKind("checkout")).toBe(true);
    expect(isConfigurableKind("trade")).toBe(true);
    expect(isConfigurableKind("flow")).toBe(true);
  });
  it("rejects kinds without one", () => {
    expect(isConfigurableKind("visa-direct")).toBe(false);
    expect(isConfigurableKind("bogus")).toBe(false);
  });
});

describe("prospectOwnedBy", () => {
  it("prefers createdById, falls back to ownerId vs dynamicUserId", () => {
    const user = { id: "u1", dynamicUserId: "dyn_1" };
    expect(
      prospectOwnedBy(user, { createdById: "u1", ownerId: null }),
    ).toBe(true);
    expect(
      prospectOwnedBy(user, { createdById: "u2", ownerId: "dyn_1" }),
    ).toBe(false); // createdById wins when present
    expect(
      prospectOwnedBy(user, { createdById: null, ownerId: "dyn_1" }),
    ).toBe(true);
    expect(
      prospectOwnedBy(user, { createdById: null, ownerId: null }),
    ).toBe(false);
  });
});

describe("computeKindScopes", () => {
  it("splits prospects into mine and team sets", () => {
    const user = { id: "u1", dynamicUserId: "dyn_1" };
    const prospects = [
      { id: "p1", teamId: null, ownerId: null, createdById: "u1" }, // mine
      { id: "p2", teamId: "t1", ownerId: null, createdById: "u2" }, // team only
      { id: "p3", teamId: "t9", ownerId: null, createdById: "u2" }, // neither
      { id: "p4", teamId: "t1", ownerId: null, createdById: "u1" }, // mine + team
    ];
    const { mine, team } = computeKindScopes(user, prospects, new Set(["t1"]));
    expect([...mine].sort()).toEqual(["p1", "p4"]);
    expect([...team].sort()).toEqual(["p2", "p4"]);
  });
});

describe("visibleKindConfigs (Tier-2 gate)", () => {
  const configs = [
    { id: "c1", prospectId: "p1" },
    { id: "c2", prospectId: "p2" },
    { id: "c3", prospectId: "p3" },
    { id: "c4", prospectId: null }, // unbound showcase config
  ];

  it("keeps only configs bound to a visible prospect, drops unbound", () => {
    const rows = visibleKindConfigs(configs, new Set(["p1", "p3"]));
    expect(rows.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("excludes a non-visible prospect entirely (no detail-row leak)", () => {
    const rows = visibleKindConfigs(configs, new Set(["p1"]));
    expect(rows.some((c) => c.prospectId === "p2")).toBe(false);
    expect(rows.map((c) => c.id)).toEqual(["c1"]);
  });

  it("admin/owner scope 'all' sees every bound config but never unbound", () => {
    const rows = visibleKindConfigs(configs, "all");
    expect(rows.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });
});
