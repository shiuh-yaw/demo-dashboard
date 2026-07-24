"use client";

/**
 * Prospect hub sub-nav: route-segment buttons (Overview / Demos / Contacts /
 * Settings), each a next/link to its segment. Active state resolves
 * client-side from the pathname, so this must stay a client component; labels
 * are plain text so no icon components cross the RSC boundary.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ProspectHubTabsProps {
  /** The hub base path, e.g. `/dashboard/prospects/{id}`. */
  basePath: string;
}

export function ProspectHubTabs({ basePath }: ProspectHubTabsProps) {
  const pathname = usePathname() ?? "";

  const tabs: { label: string; href: string }[] = [
    { label: "Overview", href: basePath },
    { label: "Demos", href: `${basePath}/demos` },
    { label: "Contacts", href: `${basePath}/contacts` },
    { label: "Settings", href: `${basePath}/settings` },
  ];

  function isActive(href: string): boolean {
    // Overview is the base segment - exact match only, so the deeper segments
    // don't also light it up. The others match themselves (prefix-safe).
    if (href === basePath) return pathname === basePath;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Prospect sections"
      // Mobile: full-width segmented control (equal pills, never scrolls/wraps).
      // sm+: plain auto-width pill row. Same four destinations stay visible.
      className="flex w-full items-center gap-1 rounded-lg bg-muted/60 p-1 sm:w-auto sm:gap-1.5 sm:rounded-none sm:bg-transparent sm:p-0"
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors sm:flex-none sm:px-3 sm:text-sm ${
              active
                ? "bg-background text-foreground shadow-sm sm:bg-secondary sm:shadow-none"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground sm:hover:bg-accent/50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
