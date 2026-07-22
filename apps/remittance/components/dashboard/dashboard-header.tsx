"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/ui/app-logo";
import { UserMenu } from "@/components/ui/user-menu";
import { useRemittanceConfig } from "@/contexts/remittance-config-context";
import { APP_NAV_ITEMS, isNavItemActive } from "@/lib/nav-items";

interface DashboardHeaderProps {
  navItems?: readonly { href: string; label: string }[];
  walletAddress?: string;
  brandHref?: string;
  brandLabel?: string;
}

/**
 * Branded-only now (post-Task-7): AppShell renders this only when a
 * theme config is active, and it IS the brand bar - keeps its own
 * brand-token styling rather than folding into the shared SiteHeader.
 * Also used unconditionally by /admin (untouched territory), which
 * passes its own navItems/brandHref/brandLabel regardless of theming -
 * so the user menu's `branded` flag is gated on the actual `configId`
 * rather than assumed true, or an unthemed admin session would get a
 * live "Clear theme" row that full-navigates to "/?theme=" for nothing.
 */
export function DashboardHeader({
  navItems: navItemsProp,
  walletAddress,
  brandHref,
  brandLabel,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const navItems = navItemsProp ?? APP_NAV_ITEMS;
  const { branding, configId } = useRemittanceConfig();

  return (
    <header className="border-b border-(--brand-border) bg-(--brand-surface)/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <AppLogo
              className="h-7 w-auto text-(--brand-fg)"
              logoUrl={branding.logoUrl}
            />
            {brandLabel ? (
              brandHref ? (
                <Link
                  href={brandHref}
                  className="text-sm font-medium text-(--brand-muted) hover:text-(--brand-primary) transition-colors"
                >
                  {brandLabel}
                </Link>
              ) : (
                <span className="text-sm font-medium text-(--brand-muted)">
                  {brandLabel}
                </span>
              )
            ) : null}
          </div>

          {/* Nav links - menu rows carry them below md */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    isActive
                      ? "bg-(--brand-primary)/10 text-(--brand-primary) font-medium cursor-pointer"
                      : "text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) cursor-pointer"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: user menu (address + copy, Book a call, Clear
              theme, Sign out) */}
          <div className="flex items-center gap-3">
            <UserMenu
              walletAddress={walletAddress}
              branded={!!configId}
              navItems={navItems}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
