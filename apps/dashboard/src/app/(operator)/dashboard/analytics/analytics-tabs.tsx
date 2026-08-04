"use client";

/**
 * Analytics sub-nav: route-segment tabs (Engagement / Catalog). Engagement is
 * the base `/dashboard/analytics` (prospect share-link demo engagement);
 * Catalog is the public demo-catalog funnel at `/dashboard/analytics/catalog`.
 * Active state resolves client-side from the pathname, so this stays a client
 * component; labels are plain text so no icon components cross the RSC boundary.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE = "/dashboard/analytics";

export function AnalyticsTabs() {
  const pathname = usePathname() ?? "";

  const tabs: { label: string; href: string }[] = [
    { label: "Engagement", href: BASE },
    { label: "Catalog", href: `${BASE}/catalog` },
  ];

  function isActive(href: string): boolean {
    // Engagement is the base segment - exact match only, so the deeper Catalog
    // segment doesn't also light it up.
    if (href === BASE) return pathname === BASE;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Underline tabs (not pills): the label always sits at the content edge, so
  // both the active and inactive tab line up with the "Analytics" title above.
  // The active state is a 2px underline overlapping the nav's baseline rule.
  return (
    <nav
      aria-label="Analytics sections"
      className="flex items-center gap-6 border-b border-border"
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
