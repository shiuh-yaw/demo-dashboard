/**
 * Scope -> Prisma WHERE builders. Pure, no IO. Must mirror the JS-filter
 * semantics of visibleProspectIds/isDemoConfigVisible exactly (parity tests
 * below), just expressed as a Prisma where fragment instead of a filter.
 */

import { describe, expect, it, vi } from "vitest";

import {
  demoConfigActiveScopeWhere,
  demoConfigVisibilityWhere,
  isDemoConfigVisible,
  isProspectVisible,
  prospectScopeWhere,
  resolveAnalyticsReadScope,
  visibleProspectIds,
} from "@/lib/auth/gtm";
import type { GtmUser, Prospect, UserRole } from "@/lib/services";
import type { ProspectScope } from "@/lib/prospect-scope";

function mkUser(role: UserRole, over: Partial<GtmUser> = {}): GtmUser {
  return {
    id: "u1",
    email: "a@fireblocks.com",
    dynamicUserId: "sub-1",
    displayName: null,
    avatarUrl: null,
    schedulingUrl: null,
    role,
    deactivatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

function mkProspect(over: Partial<Prospect>): Prospect {
  return {
    id: "p1",
    ownerId: "sub-1",
    teamId: null,
    createdById: "u1",
    status: "ACTIVE",
    name: "Acme",
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

/** Same fixture shape as gtm.test.ts's visibleProspectIds describe block. */
const prospects = [
  mkProspect({ id: "p-own", createdById: "u1", teamId: null }),
  mkProspect({ id: "p-legacy-own", createdById: null, ownerId: "sub-1", teamId: null }),
  mkProspect({ id: "p-team", createdById: "u2", ownerId: "sub-2", teamId: "team-1" }),
  mkProspect({ id: "p-other", createdById: "u3", ownerId: "sub-3", teamId: "team-2" }),
  mkProspect({ id: "p-orphan", createdById: null, ownerId: "", teamId: null }),
  // Reassigned away from u1: legacy ownerId still points at u1's dynamicUserId,
  // but createdById now belongs to someone else - createdById always wins.
  mkProspect({ id: "p-reassigned-away", createdById: "u2", ownerId: "sub-1", teamId: null }),
];

/** Shared DemoConfig fixtures, referenced by both the builder and parity describes. */
const demoConfigs = [
  { id: "d-own", createdById: "u1", ownerId: "sub-1", prospectId: null, prospect: null },
  { id: "d-legacy-own", createdById: null, ownerId: "sub-1", prospectId: null, prospect: null },
  {
    id: "d-bound-visible",
    createdById: "u2",
    ownerId: "sub-2",
    prospectId: "p-team",
    prospect: prospects.find((p) => p.id === "p-team"),
  },
  {
    id: "d-bound-not-visible",
    createdById: "u3",
    ownerId: "sub-3",
    prospectId: "p-other",
    prospect: prospects.find((p) => p.id === "p-other"),
  },
  {
    id: "d-own-bound-unseen-prospect",
    createdById: "u1",
    ownerId: "sub-1",
    prospectId: "p-other",
    prospect: prospects.find((p) => p.id === "p-other"),
  },
  { id: "d-orphan-unbound", createdById: null, ownerId: null, prospectId: null, prospect: null },
];

function demoRowsMatchedBy(where: Record<string, unknown>): string[] {
  return demoConfigs.filter((d) => matches(where, d)).map((d) => d.id);
}

/** In-memory matcher for the Prisma where fragments under test - just enough
 * of the operators these builders emit (OR/AND/in/plain-equality/relation). */
function matches(where: Record<string, unknown>, row: object): boolean {
  const r = row as Record<string, unknown>;
  for (const [key, cond] of Object.entries(where)) {
    if (key === "OR") {
      if (!(cond as Record<string, unknown>[]).some((c) => matches(c, r))) return false;
      continue;
    }
    if (key === "AND") {
      if (!(cond as Record<string, unknown>[]).every((c) => matches(c, r))) return false;
      continue;
    }
    if (key === "NOT") {
      // Prisma semantics: NOT { a, b } excludes rows where a AND b both hold.
      if (matches(cond as Record<string, unknown>, r)) return false;
      continue;
    }
    if (key === "prospect") {
      const prospect = r.prospect as Record<string, unknown> | null;
      if (!prospect) return false;
      if (!matches(cond as Record<string, unknown>, prospect)) return false;
      continue;
    }
    if (cond !== null && typeof cond === "object" && "in" in (cond as object)) {
      const list = (cond as { in: unknown[] }).in;
      if (!list.includes(r[key])) return false;
      continue;
    }
    if (r[key] !== cond) return false;
  }
  return true;
}

function rowsMatchedBy(where: Record<string, unknown>): string[] {
  return prospects.filter((p) => matches(where, p)).map((p) => p.id);
}

describe("prospectScopeWhere", () => {
  it("admin + all -> unscoped apart from unclaimed AUTO rows", () => {
    const where = prospectScopeWhere(mkUser("ADMIN"), { kind: "all" });
    expect(where).toEqual({ NOT: { status: "AUTO", ownerId: null, createdById: null } });
    // Every curated row still matches - the exclusion is narrow.
    expect(rowsMatchedBy(where as Record<string, unknown>)).toEqual(
      prospects.map((p) => p.id),
    );
  });

  it("owner + all -> same", () => {
    expect(prospectScopeWhere(mkUser("OWNER"), { kind: "all" })).toEqual({
      NOT: { status: "AUTO", ownerId: null, createdById: null },
    });
  });

  it("no scope shows an unclaimed AUTO prospect - it lives in its own queue", () => {
    const rows = [
      mkProspect({ id: "p-auto", status: "AUTO", ownerId: null, createdById: null }),
      mkProspect({ id: "p-normal", createdById: "u1" }),
    ];
    const where = prospectScopeWhere(mkUser("ADMIN"), { kind: "all" });
    const ids = rows
      .filter((p) => matches(where as Record<string, unknown>, p))
      .map((p) => p.id);
    expect(ids).toEqual(["p-normal"]);
  });

  it("an AUTO prospect that HAS been claimed is listed normally", () => {
    // Claiming records createdById and flips the status to ACTIVE; either
    // alone is enough to stop the exclusion applying.
    const rows = [
      mkProspect({ id: "p-claimed", status: "AUTO", ownerId: null, createdById: "u1" }),
    ];
    const where = prospectScopeWhere(mkUser("ADMIN"), { kind: "all" });
    expect(
      rows.filter((p) => matches(where as Record<string, unknown>, p)).map((p) => p.id),
    ).toEqual(["p-claimed"]);
  });

  it("non-admin + all fails closed (defense in depth - enforceScope should never let this through)", () => {
    expect(prospectScopeWhere(mkUser("MEMBER"), { kind: "all" })).toEqual({ id: { in: [] } });
  });

  it("mine -> OR of createdById-mine / unclaimed-legacy-ownerId-mine", () => {
    const where = prospectScopeWhere(mkUser("MEMBER"), { kind: "mine" });
    expect(rowsMatchedBy(where as Record<string, unknown>).sort()).toEqual(
      ["p-own", "p-legacy-own"].sort(),
    );
  });

  it("mine excludes a prospect reassigned away, even though legacy ownerId still matches", () => {
    const where = prospectScopeWhere(mkUser("MEMBER"), { kind: "mine" });
    expect(rowsMatchedBy(where as Record<string, unknown>)).not.toContain("p-reassigned-away");
  });

  it("mine with no dynamicUserId only matches createdById (no null===null ownerId leak)", () => {
    const where = prospectScopeWhere(
      mkUser("MEMBER", { dynamicUserId: null }),
      { kind: "mine" },
    );
    expect(rowsMatchedBy(where as Record<string, unknown>)).toEqual(["p-own"]);
  });

  it("team -> teamId, still excluding unclaimed AUTO", () => {
    const where = prospectScopeWhere(mkUser("MEMBER"), { kind: "team", teamId: "team-1" });
    expect(where).toEqual({
      AND: [{ teamId: "team-1" }, { NOT: { status: "AUTO", ownerId: null, createdById: null } }],
    });
    expect(rowsMatchedBy(where as Record<string, unknown>)).toEqual(["p-team"]);
  });

  it("empty/missing scope fails closed to { id: { in: [] } }", () => {
    expect(prospectScopeWhere(mkUser("MEMBER"), undefined)).toEqual({ id: { in: [] } });
    expect(prospectScopeWhere(mkUser("MEMBER"), null)).toEqual({ id: { in: [] } });
  });

  it("mine + teamId -> AND(ownWhere, teamId) - only the caller's own prospects in that team", () => {
    const rows = [
      mkProspect({ id: "p-own-team", createdById: "u1", teamId: "team-1" }),
      mkProspect({ id: "p-own-other-team", createdById: "u1", teamId: "team-2" }),
      mkProspect({ id: "p-teammate-team", createdById: "u2", teamId: "team-1" }),
    ];
    const where = prospectScopeWhere(mkUser("MEMBER"), { kind: "mine", teamId: "team-1" });
    const ids = rows
      .filter((p) => matches(where as Record<string, unknown>, p))
      .map((p) => p.id);
    expect(ids).toEqual(["p-own-team"]);
  });
});

describe("demoConfigVisibilityWhere", () => {
  it("'all' -> {} (unscoped)", () => {
    expect(demoConfigVisibilityWhere(mkUser("ADMIN"), "all")).toEqual({});
  });

  it("resolved visible set: own records always match, plus bound records whose prospect is visible", () => {
    const user = mkUser("MEMBER");
    const where = demoConfigVisibilityWhere(user, new Set(["p-team"]));
    const ids = demoRowsMatchedBy(where as Record<string, unknown>).sort();
    expect(ids).toEqual(
      ["d-own", "d-legacy-own", "d-bound-visible", "d-own-bound-unseen-prospect"].sort(),
    );
    expect(ids).not.toContain("d-bound-not-visible");
    expect(ids).not.toContain("d-orphan-unbound");
  });

  it("empty visible set still grants own-record visibility (own is unconditional)", () => {
    const user = mkUser("MEMBER");
    const where = demoConfigVisibilityWhere(user, new Set());
    const ids = demoRowsMatchedBy(where as Record<string, unknown>).sort();
    expect(ids).toEqual(["d-own", "d-legacy-own", "d-own-bound-unseen-prospect"].sort());
  });

  it("matches isDemoConfigVisible exactly across the fixture, for both 'all' and a resolved set", () => {
    const admin = mkUser("ADMIN");
    const whereAll = demoConfigVisibilityWhere(admin, "all");
    for (const d of demoConfigs) {
      expect(matches(whereAll as Record<string, unknown>, d)).toBe(
        isDemoConfigVisible(admin, "all", d),
      );
    }

    const user = mkUser("MEMBER");
    const visible = new Set(["p-team"]);
    const whereScoped = demoConfigVisibilityWhere(user, visible);
    for (const d of demoConfigs) {
      expect(matches(whereScoped as Record<string, unknown>, d)).toBe(
        isDemoConfigVisible(user, visible, d),
      );
    }
  });
});

describe("demoConfigActiveScopeWhere (active My/Team/All scope, list-filtering not visibility)", () => {
  const pOwnTeam = mkProspect({ id: "p-own-team", createdById: "u1", teamId: "team-1" });
  const pOwnPersonal = mkProspect({ id: "p-own-personal", createdById: "u1", teamId: null });
  const pTeammateTeam = mkProspect({ id: "p-teammate-team", createdById: "u2", teamId: "team-1" });
  const pOwnOtherTeam = mkProspect({ id: "p-own-other-team", createdById: "u1", teamId: "team-2" });

  const configs = [
    { id: "d-own-unbound", createdById: "u1", ownerId: "sub-1", prospectId: null, prospect: null },
    {
      id: "d-own-on-team-prospect",
      createdById: "u1",
      ownerId: "sub-1",
      prospectId: "p-own-team",
      prospect: pOwnTeam,
    },
    {
      id: "d-own-on-personal-prospect",
      createdById: "u1",
      ownerId: "sub-1",
      prospectId: "p-own-personal",
      prospect: pOwnPersonal,
    },
    {
      id: "d-not-owned-on-team-prospect",
      createdById: "u2",
      ownerId: "sub-2",
      prospectId: "p-teammate-team",
      prospect: pTeammateTeam,
    },
    // Config I authored, bound to a prospect a TEAMMATE created, in the active
    // team - exposes the dropped ownWhere(user) disjunct in the mine+teamId
    // branch (must be included: createdById wins per the ownership rule).
    {
      id: "d-mine-authored-teammate-prospect",
      createdById: "u1",
      ownerId: "sub-1",
      prospectId: "p-teammate-team",
      prospect: pTeammateTeam,
    },
    // Config a TEAMMATE authored, bound to a prospect I own, in the active
    // team - pre-existing "prospect-owned counts as mine" behavior, must stay
    // included.
    {
      id: "d-teammate-authored-my-prospect",
      createdById: "u2",
      ownerId: "sub-2",
      prospectId: "p-own-team",
      prospect: pOwnTeam,
    },
    // Config I authored, bound to a prospect in a DIFFERENT team than the
    // active one - must stay excluded (team filter still applies).
    {
      id: "d-mine-different-team",
      createdById: "u1",
      ownerId: "sub-1",
      prospectId: "p-own-other-team",
      prospect: pOwnOtherTeam,
    },
    { id: "d-orphan-unbound", createdById: null, ownerId: null, prospectId: null, prospect: null },
  ];

  function idsMatched(where: Record<string, unknown>): string[] {
    return configs.filter((c) => matches(where, c)).map((c) => c.id).sort();
  }

  it("all -> {} (every config, including orphans)", () => {
    expect(demoConfigActiveScopeWhere(mkUser("ADMIN"), { kind: "all" })).toEqual({});
  });

  it("team T -> team-bound configs only, personal/unbound excluded even when owned", () => {
    const where = demoConfigActiveScopeWhere(mkUser("MEMBER"), { kind: "team", teamId: "team-1" });
    expect(idsMatched(where as Record<string, unknown>)).toEqual(
      [
        "d-not-owned-on-team-prospect",
        "d-own-on-team-prospect",
        "d-mine-authored-teammate-prospect",
        "d-teammate-authored-my-prospect",
      ].sort(),
    );
  });

  it("mine (no active team) -> own configs incl. unbound, plus configs on my prospects", () => {
    const where = demoConfigActiveScopeWhere(mkUser("MEMBER"), { kind: "mine" });
    expect(idsMatched(where as Record<string, unknown>)).toEqual(
      [
        "d-own-unbound",
        "d-own-on-team-prospect",
        "d-own-on-personal-prospect",
        "d-mine-authored-teammate-prospect",
        "d-teammate-authored-my-prospect",
        "d-mine-different-team",
      ].sort(),
    );
  });

  it("mine + teamId T -> configs I authored OR own the prospect, scoped to team T; personal/unbound and other-team excluded", () => {
    const where = demoConfigActiveScopeWhere(mkUser("MEMBER"), { kind: "mine", teamId: "team-1" });
    expect(idsMatched(where as Record<string, unknown>)).toEqual(
      [
        "d-own-on-team-prospect",
        "d-mine-authored-teammate-prospect",
        "d-teammate-authored-my-prospect",
      ].sort(),
    );
  });

  it("mine + teamId T -> config I authored is excluded when its bound prospect is in a DIFFERENT team", () => {
    const where = demoConfigActiveScopeWhere(mkUser("MEMBER"), { kind: "mine", teamId: "team-1" });
    expect(idsMatched(where as Record<string, unknown>)).not.toContain("d-mine-different-team");
  });

  it("empty/missing scope fails closed (no rows match)", () => {
    const where = demoConfigActiveScopeWhere(mkUser("MEMBER"), undefined);
    expect(idsMatched(where as Record<string, unknown>)).toEqual([]);
  });
});

describe("parity with visibleProspectIds / isDemoConfigVisible", () => {
  function depsWith(memberships: { teamId: string; role: UserRole }[]) {
    return {
      teams: {
        membershipsForUser: vi.fn().mockResolvedValue(
          memberships.map((m, i) => ({
            id: `m${i}`,
            userId: "u1",
            teamId: m.teamId,
            role: m.role,
            createdAt: new Date(),
          })),
        ),
      },
      prospects: {
        listIds: vi.fn((where: Record<string, unknown>) =>
          Promise.resolve(rowsMatchedBy(where)),
        ),
      },
    };
  }

  it("scope=mine where-fragment matches exactly the prospects visibleProspectIds+ownsProspect calls 'mine'", async () => {
    const user = mkUser("MEMBER");
    const visible = (await visibleProspectIds(user, depsWith([{ teamId: "team-1", role: "MEMBER" }]))) as Set<
      string
    >;
    const scope: ProspectScope = { kind: "mine" };
    const where = prospectScopeWhere(user, scope);
    const fromWhere = new Set(rowsMatchedBy(where as Record<string, unknown>));
    // "mine" is the subset of the base visible set the user actually owns.
    const expectedMine = new Set(
      prospects.filter((p) => isProspectVisible(visible, p.id) && ownsProspectForTest(user, p)).map((p) => p.id),
    );
    expect(fromWhere).toEqual(expectedMine);
  });

  it("scope=team(team-1) where-fragment matches exactly the visible+team-scoped prospects", async () => {
    const user = mkUser("MEMBER");
    const visible = (await visibleProspectIds(user, depsWith([{ teamId: "team-1", role: "MEMBER" }]))) as Set<
      string
    >;
    const scope: ProspectScope = { kind: "team", teamId: "team-1" };
    const where = prospectScopeWhere(user, scope);
    const fromWhere = new Set(rowsMatchedBy(where as Record<string, unknown>));
    const expectedTeam = new Set(
      prospects
        .filter((p) => isProspectVisible(visible, p.id) && p.teamId === "team-1")
        .map((p) => p.id),
    );
    expect(fromWhere).toEqual(expectedTeam);
  });

  it("scope=all (admin) where-fragment matches every prospect, same as visibleProspectIds('all')", async () => {
    const admin = mkUser("ADMIN");
    const visible = await visibleProspectIds(admin, depsWith([]));
    expect(visible).toBe("all");
    const where = prospectScopeWhere(admin, { kind: "all" });
    expect(new Set(rowsMatchedBy(where as Record<string, unknown>))).toEqual(
      new Set(prospects.map((p) => p.id)),
    );
  });

  function ownsProspectForTest(
    user: Pick<GtmUser, "id" | "dynamicUserId">,
    p: { createdById: string | null; ownerId: string | null },
  ): boolean {
    return p.createdById ? p.createdById === user.id : !!p.ownerId && p.ownerId === user.dynamicUserId;
  }

});

describe("resolveAnalyticsReadScope (AnalyticsReadScope for an already-resolved active ProspectScope)", () => {
  function fakeProspectsDeps() {
    return {
      prospects: {
        listIds: vi.fn((where: Record<string, unknown>) =>
          Promise.resolve(rowsMatchedBy(where)),
        ),
      },
    };
  }

  it("admin + all -> the 'all' sentinel without ever querying prospects", async () => {
    const deps = fakeProspectsDeps();
    const scope = await resolveAnalyticsReadScope(
      mkUser("ADMIN"),
      { kind: "all" },
      deps,
    );
    expect(scope).toBe("all");
    expect(deps.prospects.listIds).not.toHaveBeenCalled();
  });

  it("non-admin + all fails closed to an empty set (defense in depth - resolveActiveScope should never let this through)", async () => {
    const deps = fakeProspectsDeps();
    const scope = await resolveAnalyticsReadScope(
      mkUser("MEMBER"),
      { kind: "all" },
      deps,
    );
    expect(scope).toEqual(new Set());
  });

  it("'mine' cell -> the concrete set of prospects the user owns", async () => {
    const deps = fakeProspectsDeps();
    const scope = await resolveAnalyticsReadScope(
      mkUser("MEMBER"),
      { kind: "mine" },
      deps,
    );
    expect(scope).toEqual(new Set(["p-own", "p-legacy-own"]));
  });

  it("'team' cell -> only that team's prospects, excluding a different team's", async () => {
    const deps = fakeProspectsDeps();
    const scopeTeam1 = await resolveAnalyticsReadScope(
      mkUser("MEMBER"),
      { kind: "team", teamId: "team-1" },
      deps,
    );
    expect(scopeTeam1).toEqual(new Set(["p-team"]));

    const scopeTeam2 = await resolveAnalyticsReadScope(
      mkUser("MEMBER"),
      { kind: "team", teamId: "team-2" },
      deps,
    );
    expect(scopeTeam2).toEqual(new Set(["p-other"]));
    expect((scopeTeam2 as Set<string>).has("p-team")).toBe(false);
  });
});
