/**
 * Policy matrix - the single owner of role comparisons. Pure functions over
 * the Role enum; every mutating action delegates here.
 */

import { describe, expect, it } from "vitest";

import {
  canAccessOperations,
  canCreateRecord,
  canMintShareLinks,
  canMutateRecord,
  canSetRole,
  type PolicyMembership,
  type PolicyRecord,
  type PolicyUser,
} from "@/lib/auth/policy";
import type { UserRole } from "@/lib/services";

const ROLES: UserRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

function user(role: UserRole, over: Partial<PolicyUser> = {}): PolicyUser {
  return { id: "u1", dynamicUserId: "sub-1", role, ...over };
}
function membership(role: UserRole): PolicyMembership {
  return { role };
}

// Record created by u1 (createdById set), owned by sub-1.
const ownRecord: PolicyRecord = { createdById: "u1", ownerId: "sub-1" };
// Record created by someone else.
const otherRecord: PolicyRecord = { createdById: "u2", ownerId: "sub-2" };
// Legacy orphan - no creator attribution at all.
const orphanRecord: PolicyRecord = { createdById: null, ownerId: null };
// Unclaimed legacy row still owned by the caller's sub (createdById null).
const legacyOwnRecord: PolicyRecord = { createdById: null, ownerId: "sub-1" };

describe("canMutateRecord", () => {
  it("global OWNER/ADMIN mutate anything, including orphans, without a membership", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      expect(canMutateRecord(user(role), null, ownRecord)).toBe(true);
      expect(canMutateRecord(user(role), null, otherRecord)).toBe(true);
      expect(canMutateRecord(user(role), null, orphanRecord)).toBe(true);
    }
  });

  it("global VIEWER never mutates, whatever the team membership says", () => {
    for (const teamRole of ROLES) {
      expect(
        canMutateRecord(user("VIEWER"), membership(teamRole), ownRecord),
      ).toBe(false);
    }
  });

  it("non-members mutate their own records but never another user's", () => {
    expect(canMutateRecord(user("MEMBER"), null, ownRecord)).toBe(true);
    expect(canMutateRecord(user("MEMBER"), null, legacyOwnRecord)).toBe(true);
    expect(canMutateRecord(user("MEMBER"), null, otherRecord)).toBe(false);
  });

  it("team OWNER/ADMIN mutate anything in the team", () => {
    for (const teamRole of ["OWNER", "ADMIN"] as const) {
      expect(
        canMutateRecord(user("MEMBER"), membership(teamRole), otherRecord),
      ).toBe(true);
    }
  });

  it("team MEMBER mutates own records (createdById wins) but not others'", () => {
    expect(
      canMutateRecord(user("MEMBER"), membership("MEMBER"), ownRecord),
    ).toBe(true);
    expect(
      canMutateRecord(user("MEMBER"), membership("MEMBER"), otherRecord),
    ).toBe(false);
  });

  it("team MEMBER falls back to ownerId===dynamicUserId for unclaimed legacy rows", () => {
    expect(
      canMutateRecord(user("MEMBER"), membership("MEMBER"), legacyOwnRecord),
    ).toBe(true);
    // A different sub does not match.
    expect(
      canMutateRecord(
        user("MEMBER", { dynamicUserId: "sub-x" }),
        membership("MEMBER"),
        legacyOwnRecord,
      ),
    ).toBe(false);
  });

  it("createdById wins over ownerId - a reassigned record follows its new owner", () => {
    // Record reassigned to u1 (createdById) though ownerId is still sub-2.
    const reassigned: PolicyRecord = { createdById: "u1", ownerId: "sub-2" };
    expect(
      canMutateRecord(user("MEMBER"), membership("MEMBER"), reassigned),
    ).toBe(true);
    // And u2 (original sub owner) can no longer mutate it as a plain member.
    expect(
      canMutateRecord(
        user("MEMBER", { id: "u2", dynamicUserId: "sub-2" }),
        membership("MEMBER"),
        reassigned,
      ),
    ).toBe(false);
  });

  it("team VIEWER never mutates", () => {
    expect(
      canMutateRecord(user("MEMBER"), membership("VIEWER"), ownRecord),
    ).toBe(false);
  });

  it("orphan rows are mutable only by global ADMIN+ (team roles cannot)", () => {
    for (const teamRole of ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const) {
      expect(
        canMutateRecord(user("MEMBER"), membership(teamRole), orphanRecord),
      ).toBe(false);
    }
  });
});

describe("canCreateRecord / canMintShareLinks (MEMBER+)", () => {
  it("allows OWNER, ADMIN, MEMBER and rejects VIEWER", () => {
    for (const fn of [canCreateRecord, canMintShareLinks]) {
      expect(fn(user("OWNER"))).toBe(true);
      expect(fn(user("ADMIN"))).toBe(true);
      expect(fn(user("MEMBER"))).toBe(true);
      expect(fn(user("VIEWER"))).toBe(false);
    }
  });
});

describe("canAccessOperations (ADMIN+)", () => {
  it("allows OWNER and ADMIN only", () => {
    expect(canAccessOperations(user("OWNER"))).toBe(true);
    expect(canAccessOperations(user("ADMIN"))).toBe(true);
    expect(canAccessOperations(user("MEMBER"))).toBe(false);
    expect(canAccessOperations(user("VIEWER"))).toBe(false);
  });
});

describe("canSetRole", () => {
  it("OWNER may set any role, including OWNER and ADMIN", () => {
    for (const target of ROLES) {
      for (const next of ROLES) {
        expect(canSetRole(user("OWNER"), target, next)).toBe(true);
      }
    }
  });

  it("ADMIN may only move between MEMBER and VIEWER", () => {
    const low: UserRole[] = ["MEMBER", "VIEWER"];
    for (const target of low) {
      for (const next of low) {
        expect(canSetRole(user("ADMIN"), target, next)).toBe(true);
      }
    }
  });

  it("ADMIN cannot touch an ADMIN or OWNER, nor promote to ADMIN/OWNER", () => {
    expect(canSetRole(user("ADMIN"), "ADMIN", "MEMBER")).toBe(false);
    expect(canSetRole(user("ADMIN"), "OWNER", "MEMBER")).toBe(false);
    expect(canSetRole(user("ADMIN"), "MEMBER", "ADMIN")).toBe(false);
    expect(canSetRole(user("ADMIN"), "MEMBER", "OWNER")).toBe(false);
  });

  it("MEMBER and VIEWER can never set roles", () => {
    for (const actor of ["MEMBER", "VIEWER"] as const) {
      for (const target of ROLES) {
        for (const next of ROLES) {
          expect(canSetRole(user(actor), target, next)).toBe(false);
        }
      }
    }
  });
});
