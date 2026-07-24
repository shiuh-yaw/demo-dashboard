/**
 * Role-based nav rendering. Admin is operator-only; everyone else sees the
 * prospect-first base. Fail closed via canAccessOperations.
 */

import { describe, expect, it } from "vitest";

import {
  navGroupsForRole,
  navItemsForRole,
  isNavItemActive,
  WORKSPACE_NAV_ITEMS,
  DOCUMENTATION_NAV_ITEM,
} from "@/components/nav-items";
import type { UserRole } from "@/lib/services";

const labels = (role: UserRole) => navItemsForRole(role).map((i) => i.label);

describe("navItemsForRole", () => {
  it("shows Admin to OWNER and ADMIN", () => {
    for (const role of ["OWNER", "ADMIN"] as UserRole[]) {
      expect(labels(role)).toEqual([
        "Prospects",
        "Demos",
        "Contacts",
        "Analytics",
        "Documentation",
        "Profile",
        "Admin",
      ]);
    }
  });

  it("hides Admin from MEMBER and VIEWER but keeps Profile and Documentation", () => {
    for (const role of ["MEMBER", "VIEWER"] as UserRole[]) {
      const l = labels(role);
      expect(l).not.toContain("Admin");
      expect(l).toEqual([
        "Prospects",
        "Demos",
        "Contacts",
        "Analytics",
        "Documentation",
        "Profile",
      ]);
    }
  });
});

describe("navGroupsForRole", () => {
  it("keeps Workspace, Documentation, Settings in order", () => {
    const groups = navGroupsForRole("VIEWER");
    expect(groups.map((g) => g.label)).toEqual([
      "Workspace",
      "Documentation",
      "Settings",
    ]);
    expect(groups[0]!.items.map((i) => i.label)).toEqual([
      "Prospects",
      "Demos",
      "Contacts",
      "Analytics",
    ]);
  });

  it("puts Profile first in Settings, Admin operator-only", () => {
    const owner = navGroupsForRole("OWNER").find((g) => g.label === "Settings");
    expect(owner!.items.map((i) => i.label)).toEqual(["Profile", "Admin"]);
    const member = navGroupsForRole("MEMBER").find(
      (g) => g.label === "Settings",
    );
    expect(member!.items.map((i) => i.label)).toEqual(["Profile"]);
  });
});

describe("isNavItemActive", () => {
  const prospects = WORKSPACE_NAV_ITEMS.find((i) => i.label === "Prospects")!;
  const demos = WORKSPACE_NAV_ITEMS.find((i) => i.label === "Demos")!;

  it("keeps Prospects active on /dashboard and /dashboard/prospects sub-routes", () => {
    expect(isNavItemActive(prospects, "/dashboard")).toBe(true);
    expect(isNavItemActive(prospects, "/dashboard/prospects/abc")).toBe(true);
    expect(isNavItemActive(prospects, "/dashboard/prospects/new")).toBe(true);
  });

  it("does not keep Prospects active on other /dashboard/* pages", () => {
    expect(isNavItemActive(prospects, "/dashboard/demos")).toBe(false);
    expect(isNavItemActive(demos, "/dashboard/demos")).toBe(true);
  });

  it("keeps Documentation active on doc sub-routes", () => {
    expect(isNavItemActive(DOCUMENTATION_NAV_ITEM, "/documentation")).toBe(true);
    expect(
      isNavItemActive(DOCUMENTATION_NAV_ITEM, "/documentation/checkouts"),
    ).toBe(true);
  });
});
