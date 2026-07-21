/**
 * Session + allowlist + visibility/mutation guards. Security boundary: fail
 * closed. Dependencies are injected so no real DB/session is touched.
 */

import { describe, expect, it, vi } from "vitest";

import {
  canMutateDemoConfig,
  canMutateProspect,
  emailDomainAllowed,
  isDemoConfigVisible,
  isProspectVisible,
  parseAllowedDomains,
  resolveSessionUser,
  visibleProspectIds,
  type SessionUserDeps,
} from "@/lib/auth/gtm";
import { PostgresGtmUserService } from "@/lib/services/postgres/users";
import { DynamicUserIdConflictError } from "@/lib/services";
import type { GtmUser, Prospect, UserRole } from "@/lib/services";
import { createFakeUserPrisma } from "@/lib/services/__tests__/fake-prisma-users";

const ALLOWED = ["fireblocks.com", "dynamic.xyz"];

describe("parseAllowedDomains", () => {
  it("splits, trims, lowercases, and drops blanks", () => {
    expect(parseAllowedDomains(" Fireblocks.com , DYNAMIC.xyz ,, ")).toEqual([
      "fireblocks.com",
      "dynamic.xyz",
    ]);
    expect(parseAllowedDomains(undefined)).toEqual([]);
    expect(parseAllowedDomains("")).toEqual([]);
  });
});

describe("emailDomainAllowed (fail-closed exact-match)", () => {
  it("passes an exact domain match, case-insensitively", () => {
    expect(emailDomainAllowed("Alice@Fireblocks.com", ALLOWED)).toBe(true);
    expect(emailDomainAllowed("bob@dynamic.xyz", ALLOWED)).toBe(true);
  });

  it("rejects lookalike and subdomain domains", () => {
    expect(emailDomainAllowed("mallory@evil-fireblocks.com", ALLOWED)).toBe(false);
    expect(emailDomainAllowed("mallory@fireblocks.com.evil.com", ALLOWED)).toBe(false);
    expect(emailDomainAllowed("mallory@sub.fireblocks.com", ALLOWED)).toBe(false);
    expect(emailDomainAllowed("mallory@fireblocks.co", ALLOWED)).toBe(false);
  });

  it("fails closed on an empty allowlist - nobody passes", () => {
    expect(emailDomainAllowed("alice@fireblocks.com", [])).toBe(false);
  });

  it("rejects malformed emails", () => {
    expect(emailDomainAllowed("no-at-sign", ALLOWED)).toBe(false);
    expect(emailDomainAllowed("trailing@", ALLOWED)).toBe(false);
  });
});

function baseDeps(
  over: Partial<SessionUserDeps> & {
    session?: { sub: string; email?: string } | null;
  } = {},
): { deps: SessionUserDeps; users: PostgresGtmUserService } {
  const users = new PostgresGtmUserService(createFakeUserPrisma());
  const deps: SessionUserDeps = {
    getCurrentUser: vi.fn().mockResolvedValue(
      over.session === undefined ? { sub: "sub-1", email: "alice@fireblocks.com" } : over.session,
    ),
    users,
    allowedDomains: ALLOWED,
    onMismatch: vi.fn(),
    ...over,
  };
  return { deps, users };
}

describe("resolveSessionUser", () => {
  it("returns null when there is no session", async () => {
    const { deps } = baseDeps({ session: null });
    expect(await resolveSessionUser(deps)).toBeNull();
  });

  it("returns null for an off-domain email", async () => {
    const { deps } = baseDeps({ session: { sub: "s", email: "x@gmail.com" } });
    expect(await resolveSessionUser(deps)).toBeNull();
  });

  it("returns null when the allowlist is empty (fail closed)", async () => {
    const { deps } = baseDeps({ allowedDomains: [] });
    expect(await resolveSessionUser(deps)).toBeNull();
  });

  it("creates a MEMBER and captures dynamicUserId, joining no team", async () => {
    const { deps } = baseDeps();
    const user = await resolveSessionUser(deps);
    expect(user).not.toBeNull();
    expect(user!.role).toBe("MEMBER");
    expect(user!.email).toBe("alice@fireblocks.com");
    expect(user!.dynamicUserId).toBe("sub-1");
  });

  it("does not re-capture dynamicUserId when it already matches", async () => {
    const { deps, users } = baseDeps();
    const first = await resolveSessionUser(deps);
    const spy = vi.spyOn(users, "update");
    const second = await resolveSessionUser(deps);
    expect(second!.id).toBe(first!.id);
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs and keeps the original dynamicUserId on a sub mismatch, never overwriting", async () => {
    const fake = createFakeUserPrisma();
    fake.__users.set("u-existing", {
      id: "u-existing",
      email: "alice@fireblocks.com",
      dynamicUserId: "old-sub",
      displayName: null,
      avatarUrl: null,
      schedulingUrl: null,
      role: "MEMBER",
      deactivatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const users = new PostgresGtmUserService(fake);
    const onMismatch = vi.fn();
    const { deps } = baseDeps({
      users,
      onMismatch,
      session: { sub: "new-sub", email: "alice@fireblocks.com" },
    });
    const user = await resolveSessionUser(deps);
    expect(user!.dynamicUserId).toBe("old-sub");
    expect(onMismatch).toHaveBeenCalledOnce();
  });

  it("catches a write-once conflict on first capture, logs, and keeps the user signed in", async () => {
    const conflictUsers = {
      getOrCreateByEmail: vi.fn().mockResolvedValue({
        id: "u1",
        email: "alice@fireblocks.com",
        dynamicUserId: null,
        displayName: null,
        avatarUrl: null,
        schedulingUrl: null,
        role: "MEMBER" as UserRole,
        deactivatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies GtmUser),
      update: vi
        .fn()
        .mockRejectedValue(new DynamicUserIdConflictError("u1", "other-sub", "sub-1")),
      claimLegacyRecords: vi.fn(),
    };
    const onMismatch = vi.fn();
    const { deps } = baseDeps({
      users: conflictUsers as unknown as SessionUserDeps["users"],
      onMismatch,
    });
    const user = await resolveSessionUser(deps);
    expect(user).not.toBeNull();
    expect(onMismatch).toHaveBeenCalledOnce();
    expect(conflictUsers.claimLegacyRecords).not.toHaveBeenCalled();
  });

  it("rejects a deactivated user like off-domain", async () => {
    const fake = createFakeUserPrisma();
    fake.__users.set("u-off", {
      id: "u-off",
      email: "alice@fireblocks.com",
      dynamicUserId: "sub-1",
      displayName: null,
      avatarUrl: null,
      schedulingUrl: null,
      role: "MEMBER",
      deactivatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const users = new PostgresGtmUserService(fake);
    const { deps } = baseDeps({ users });
    expect(await resolveSessionUser(deps)).toBeNull();
  });
});

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
    demoEarnId: null,
    demoCheckoutsId: null,
    demoWalletId: null,
    demoRemittanceId: null,
    domain: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe("visibleProspectIds (progressive: own + team)", () => {
  // u1 owns p-own + legacy p-legacy-own; belongs to team-1 (holds p-team);
  // p-other belongs to team-2 (not u1's); p-orphan has no attribution.
  const prospects = [
    mkProspect({ id: "p-own", createdById: "u1", teamId: null }),
    mkProspect({ id: "p-legacy-own", createdById: null, ownerId: "sub-1", teamId: null }),
    mkProspect({ id: "p-team", createdById: "u2", ownerId: "sub-2", teamId: "team-1" }),
    mkProspect({ id: "p-other", createdById: "u3", ownerId: "sub-3", teamId: "team-2" }),
    mkProspect({ id: "p-orphan", createdById: null, ownerId: "", teamId: null }),
  ];
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
      prospects: { list: vi.fn().mockResolvedValue(prospects), get: vi.fn() },
    };
  }

  it("ADMIN/OWNER are unscoped ('all')", async () => {
    const deps = depsWith([]);
    expect(await visibleProspectIds(mkUser("ADMIN"), deps)).toBe("all");
    expect(await visibleProspectIds(mkUser("OWNER"), deps)).toBe("all");
  });

  it("MEMBER with a team membership sees own + team prospects, never others' or orphans", async () => {
    const visible = await visibleProspectIds(
      mkUser("MEMBER"),
      depsWith([{ teamId: "team-1", role: "MEMBER" }]),
    );
    const set = visible as Set<string>;
    expect(set.has("p-own")).toBe(true);
    expect(set.has("p-legacy-own")).toBe(true);
    expect(set.has("p-team")).toBe(true);
    expect(set.has("p-other")).toBe(false);
    expect(set.has("p-orphan")).toBe(false);
  });

  it("MEMBER with zero memberships is mine-only", async () => {
    const visible = await visibleProspectIds(mkUser("MEMBER"), depsWith([]));
    const set = visible as Set<string>;
    expect(set.has("p-own")).toBe(true);
    expect(set.has("p-legacy-own")).toBe(true);
    expect(set.has("p-team")).toBe(false);
    expect(set.has("p-other")).toBe(false);
    expect(set.has("p-orphan")).toBe(false);
  });

  it("MEMBER cannot see another member's prospect", async () => {
    const visible = (await visibleProspectIds(
      mkUser("MEMBER", { id: "u9", dynamicUserId: "sub-9" }),
      depsWith([]),
    )) as Set<string>;
    expect(visible.size).toBe(0);
  });
});

describe("isProspectVisible / isDemoConfigVisible", () => {
  const u = mkUser("MEMBER");

  it("isProspectVisible: 'all' passes, scoped set gates, unbound null is not visible when scoped", () => {
    expect(isProspectVisible("all", "anything")).toBe(true);
    expect(isProspectVisible("all", null)).toBe(true);
    expect(isProspectVisible(new Set(["p1"]), "p1")).toBe(true);
    expect(isProspectVisible(new Set(["p1"]), "p2")).toBe(false);
    expect(isProspectVisible(new Set(), null)).toBe(false);
  });

  it("isDemoConfigVisible: bound, not-owned follows prospect visibility", () => {
    expect(
      isDemoConfigVisible(u, new Set(["p1"]), {
        prospectId: "p1",
        createdById: "u2",
        ownerId: "sub-2",
      }),
    ).toBe(true);
    expect(
      isDemoConfigVisible(u, new Set(["p1"]), {
        prospectId: "p2",
        createdById: "u2",
        ownerId: "sub-2",
      }),
    ).toBe(false);
  });

  // M-1: own-record visibility must never be derived through prospect
  // visibility - a user's own demo stays visible even bound to a prospect
  // they can't see (e.g. created by passing a foreign id to the picker).
  it("isDemoConfigVisible: own demo bound to an unseen prospect is still visible", () => {
    expect(
      isDemoConfigVisible(u, new Set(["p1"]), {
        prospectId: "p2",
        createdById: "u1",
        ownerId: "sub-1",
      }),
    ).toBe(true);
    // Legacy own row (ownerId fallback) gets the same treatment.
    expect(
      isDemoConfigVisible(u, new Set(["p1"]), {
        prospectId: "p2",
        createdById: null,
        ownerId: "sub-1",
      }),
    ).toBe(true);
  });

  it("isDemoConfigVisible: unbound is own-only for scoped users, all for ADMIN/OWNER", () => {
    // Own unbound demo.
    expect(
      isDemoConfigVisible(u, new Set(), {
        prospectId: null,
        createdById: "u1",
        ownerId: "sub-1",
      }),
    ).toBe(true);
    // Legacy own unbound demo (ownerId fallback).
    expect(
      isDemoConfigVisible(u, new Set(), {
        prospectId: null,
        createdById: null,
        ownerId: "sub-1",
      }),
    ).toBe(true);
    // Another member's unbound demo.
    expect(
      isDemoConfigVisible(u, new Set(), {
        prospectId: null,
        createdById: "u2",
        ownerId: "sub-2",
      }),
    ).toBe(false);
    // Orphan unbound demo.
    expect(
      isDemoConfigVisible(u, new Set(), {
        prospectId: null,
        createdById: null,
        ownerId: null,
      }),
    ).toBe(false);
    // ADMIN/OWNER ('all') see everything, including orphans.
    expect(
      isDemoConfigVisible(mkUser("ADMIN"), "all", {
        prospectId: null,
        createdById: null,
        ownerId: null,
      }),
    ).toBe(true);
  });
});

describe("canMutateProspect / canMutateDemoConfig (progressive)", () => {
  function guardDeps(
    memberships: { teamId: string; role: UserRole }[] = [],
    prospectTeamId: string | null = null,
  ) {
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
        get: vi.fn().mockResolvedValue(mkProspect({ id: "p1", teamId: prospectTeamId })),
        list: vi.fn(),
      },
    };
  }

  it("VIEWER cannot mutate a prospect or demo", async () => {
    const deps = guardDeps();
    expect(
      await canMutateProspect(mkUser("VIEWER"), mkProspect({ createdById: "u1" }), deps),
    ).toBe(false);
    expect(
      await canMutateDemoConfig(
        mkUser("VIEWER"),
        { prospectId: "p1", createdById: "u1", ownerId: "sub-1" },
        deps,
      ),
    ).toBe(false);
  });

  it("MEMBER with zero memberships edits own records but not another user's", async () => {
    const deps = guardDeps();
    expect(
      await canMutateProspect(
        mkUser("MEMBER"),
        mkProspect({ teamId: null, createdById: "u1", ownerId: "sub-1" }),
        deps,
      ),
    ).toBe(true);
    expect(
      await canMutateProspect(
        mkUser("MEMBER"),
        mkProspect({ teamId: null, createdById: "u2", ownerId: "sub-2" }),
        deps,
      ),
    ).toBe(false);
  });

  it("team OWNER/ADMIN mutate another member's record in that team", async () => {
    const deps = guardDeps([{ teamId: "team-1", role: "ADMIN" }], "team-1");
    expect(
      await canMutateProspect(
        mkUser("MEMBER"),
        mkProspect({ teamId: "team-1", createdById: "u2", ownerId: "sub-2" }),
        deps,
      ),
    ).toBe(true);
  });

  it("ADMIN edits anything, including orphan rows", async () => {
    const deps = guardDeps();
    expect(
      await canMutateDemoConfig(
        mkUser("ADMIN"),
        { prospectId: null, createdById: null, ownerId: null },
        deps,
      ),
    ).toBe(true);
    expect(
      await canMutateProspect(mkUser("ADMIN"), mkProspect({ createdById: null, ownerId: "" }), deps),
    ).toBe(true);
  });

  it("MEMBER edits own unbound demo without consulting a prospect", async () => {
    const deps = guardDeps();
    const ok = await canMutateDemoConfig(
      mkUser("MEMBER"),
      { prospectId: null, createdById: "u1", ownerId: "sub-1" },
      deps,
    );
    expect(ok).toBe(true);
    expect(deps.prospects.get).not.toHaveBeenCalled();
  });

  it("MEMBER cannot edit another member's unbound demo", async () => {
    const deps = guardDeps();
    expect(
      await canMutateDemoConfig(
        mkUser("MEMBER"),
        { prospectId: null, createdById: "u2", ownerId: "sub-2" },
        deps,
      ),
    ).toBe(false);
  });
});
