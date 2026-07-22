/**
 * Nav item helpers — server-safe (no "use client").
 * Used by layouts and DashboardHeader.
 */

export interface NavItem {
  href: string;
  label: string;
}

const APP_NAV_BASE = [
  { path: "/overview", label: "Overview" },
  { path: "/history", label: "History" },
  { path: "/settings", label: "Settings" },
  { path: "/admin", label: "Admin" },
] as const;

export const APP_NAV_ITEMS: readonly NavItem[] = APP_NAV_BASE.map((item) => ({
  href: item.path,
  label: item.label,
}));

/**
 * Shared active-tab check for both the branded DashboardHeader nav and
 * the unbranded merged SiteHeader's center nav - Overview and Admin
 * match on exact path (both are ancestors of other routes), everything
 * else matches by prefix.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/overview") return pathname === "/overview";
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

/* /admin/assets stays routable but is hidden from the nav. */
const ADMIN_NAV_BASE = [
  { path: "/admin", label: "Users" },
  { path: "/admin/vaults", label: "Vaults" },
  { path: "/overview", label: "Home" },
] as const;

export const ADMIN_NAV_ITEMS: readonly NavItem[] = ADMIN_NAV_BASE.map(
  (item) => ({
    href: item.path,
    label: item.label,
  }),
);
