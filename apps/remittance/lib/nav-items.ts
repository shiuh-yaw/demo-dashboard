/**
 * Nav item helpers — server-safe (no "use client").
 * Used by layouts and DashboardHeader.
 */

const APP_NAV_BASE = [
  { path: "/", label: "Overview" },
  { path: "/history", label: "Transfer History" },
  { path: "/settings", label: "Settings" },
  { path: "/admin", label: "Admin" },
] as const;

export const APP_NAV_ITEMS = APP_NAV_BASE.map((item) => ({
  href: item.path,
  label: item.label,
}));

export function getAppNavItems(
  basePath = "",
): readonly { href: string; label: string }[] {
  if (!basePath) return APP_NAV_ITEMS;
  return APP_NAV_BASE.map((item) => ({
    href: item.path === "/" ? `${basePath}/dashboard` : `${basePath}${item.path}`,
    label: item.label,
  }));
}

const ADMIN_NAV_BASE = [
  { path: "/admin", label: "Users" },
  { path: "/admin/vaults", label: "Vaults" },
  { path: "/admin/assets", label: "Assets" },
] as const;

export const ADMIN_NAV_ITEMS = ADMIN_NAV_BASE.map((item) => ({
  href: item.path,
  label: item.label,
}));

export function getAdminNavItems(
  basePath = "",
): readonly { href: string; label: string }[] {
  if (!basePath) return ADMIN_NAV_ITEMS;
  return ADMIN_NAV_BASE.map((item) => ({
    href: `${basePath}${item.path}`,
    label: item.label,
  }));
}
