/**
 * GTM nav model. Pure data + the role gate for the Admin group, so role-based
 * nav rendering is unit-testable without a DOM. Nav hiding is cosmetic; every
 * underlying action re-checks the role server-side.
 */

import {
  Building2,
  LayoutGrid,
  LineChart,
  Users,
  UserRound,
  Shield,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

import { canAccessOperations } from "@/lib/auth/policy";
import type { UserRole } from "@/lib/services";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only active when the pathname exactly equals href (the home item). */
  exact?: boolean;
  /** Extra path prefixes that also activate this item (beyond href). */
  activeMatch?: string[];
}

/**
 * A nav item is active when the pathname equals its href, starts with
 * `href + "/"` (unless `exact`), or starts with any configured extra prefix.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  if (!item.exact && pathname.startsWith(item.href + "/")) return true;
  return (item.activeMatch ?? []).some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export interface NavGroup {
  /** Uppercase section heading. */
  label: string;
  items: NavItem[];
}

/** Workspace group. Prospects is the home/overview and the primary entry point. */
export const WORKSPACE_NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Prospects",
    icon: Building2,
    exact: true,
    activeMatch: ["/dashboard/prospects"],
  },
  { href: "/dashboard/demos", label: "Demos", icon: LayoutGrid },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart },
];

/** Documentation group, visible to everyone (provider integration docs). */
export const DOCUMENTATION_NAV_ITEM: NavItem = {
  href: "/documentation",
  label: "Documentation",
  icon: BookOpen,
};

/** Profile self-service, visible to everyone; leads the Settings group. */
export const PROFILE_NAV_ITEM: NavItem = {
  href: "/dashboard/profile",
  label: "Profile",
  icon: UserRound,
};

/** Admin item, operator-gated (Teams and roles live here). */
export const ADMIN_NAV_ITEM: NavItem = {
  href: "/dashboard/operations",
  label: "Admin",
  icon: Shield,
};

/**
 * The grouped sidebar sections a role sees. Documentation is universal; the
 * Settings group always shows Profile and adds Admin for ADMIN/OWNER only.
 */
export function navGroupsForRole(role: UserRole): NavGroup[] {
  const settingsItems: NavItem[] = [PROFILE_NAV_ITEM];
  if (canAccessOperations({ id: "", dynamicUserId: null, role })) {
    settingsItems.push(ADMIN_NAV_ITEM);
  }
  return [
    { label: "Workspace", items: WORKSPACE_NAV_ITEMS },
    { label: "Documentation", items: [DOCUMENTATION_NAV_ITEM] },
    { label: "Settings", items: settingsItems },
  ];
}

/** Flat ordered nav items a role sees. */
export function navItemsForRole(role: UserRole): NavItem[] {
  return navGroupsForRole(role).flatMap((g) => g.items);
}
