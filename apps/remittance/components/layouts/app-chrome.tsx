"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteHeader, SiteFooter } from "@dynamic-demos/ui";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { UserMenu } from "@/components/ui/user-menu";
import { useRemittanceConfig } from "@/contexts/remittance-config-context";
import { isNavItemActive, type NavItem } from "@/lib/nav-items";

/**
 * Center-slot nav for the unbranded merged SiteHeader - same items and
 * active-state styling as DashboardHeader's own nav (isNavItemActive
 * shared from lib/nav-items), just living in the shared shell's center
 * slot instead of a second app bar.
 */
function CenterNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
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
  );
}

export interface AppChromeProps {
  walletAddress?: string;
  /** Nav items for the center slot, the branded bar, and the mobile menu rows. */
  navItems: readonly NavItem[];
  /** Branded DashboardHeader label/link (admin passes its own). */
  brandLabel?: string;
  brandHref?: string;
  children: React.ReactNode;
}

/**
 * Post-auth chrome shared by the app shell and /admin. Merged-header
 * rule (matches trade/earn): unbranded, the shared SiteHeader IS the
 * app bar (Demos / Remittance breadcrumb + hover grid, nav + user menu
 * in center/trailing - no second bar, no doubled Dynamic logo). Branded
 * (?theme=) drops the Dynamic chrome and keeps remittance's own
 * DashboardHeader brand bar. The SiteFooter's marketing CTAs never show
 * on a branded surface (#157) - a themed demo must not advertise
 * "Get a free account".
 */
export function AppChrome({
  walletAddress = "",
  navItems,
  brandLabel,
  brandHref,
  children,
}: AppChromeProps) {
  const { configId } = useRemittanceConfig();
  const hasSiteChrome = !configId;

  return (
    <DashboardLayout
      header={
        hasSiteChrome ? (
          <SiteHeader
            homeHref="https://dynamic.dev"
            chip="Remittance"
            fullWidth
            center={<CenterNav items={navItems} />}
            trailing={
              <UserMenu
                walletAddress={walletAddress}
                branded={false}
                navItems={navItems}
              />
            }
          />
        ) : (
          <DashboardHeader
            walletAddress={walletAddress}
            navItems={navItems}
            brandLabel={brandLabel}
            brandHref={brandHref}
          />
        )
      }
      footer={
        // Branded keeps Book a call in the footer; only the sign-up CTA
        // is gated (a themed demo must not advertise "Get a free account").
        <SiteFooter fullWidth showCtas showSignupCta={hasSiteChrome} />
      }
    >
      {children}
    </DashboardLayout>
  );
}
