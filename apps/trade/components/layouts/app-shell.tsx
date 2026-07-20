"use client";

/**
 * App Shell Component
 *
 * Top nav bar layout: logo on left, utility icons on right.
 * Content area below fills remaining viewport height.
 */

import { type ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@dynamic-demos/ui";
import { AppLogo } from "@/components/ui/app-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConnectButton } from "@/components/ui/connect-button";
import { NetworkSwitcher } from "@/components/ui/network-switcher";
import { useTradeConfig } from "@/contexts/trade-config-context";
import { NavBar } from "./nav-bar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { branding, configId } = useTradeConfig();

  // Earn's merged-header rule: unbranded, the shared SiteHeader IS the
  // app bar (Demos / Trade breadcrumb + hover grid, trade's controls in
  // the trailing slot - no second bar, no doubled Dynamic logo). Branded
  // (?theme=) drops the Dynamic chrome and keeps trade's own brand bar.
  const hasSiteChrome = !configId;

  const controls = (
    <>
      {/* The network switcher needs the width md+ affords (it moves
          into the wallet dropdown on phones); the theme toggle and
          connect button stay reachable at every size. Book a call lives
          in the wallet menu - a fourth bar control read as clutter. */}
      <ThemeToggle />
      <div className="hidden items-center gap-2 md:flex">
        <NetworkSwitcher />
      </div>
      <ConnectButton />
    </>
  );

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-trade-bg">
      {hasSiteChrome ? (
        // z-20 keeps the trailing dropdowns above main content; the
        // shell's flex column (header shrink-0, main scrolls) keeps the
        // bar visible without relying on SiteHeader's sticky.
        <div className="relative z-20 shrink-0">
          <SiteHeader
            homeHref="https://dynamic.dev"
            chip="Trade"
            fullWidth
            trailing={controls}
          />
        </div>
      ) : (
        <header className="relative z-20 shrink-0 bg-trade-bg overflow-visible">
          <div className="flex items-center justify-between h-14 lg:h-16 px-4 lg:px-8">
            {/* Left: Logo - clickable, links to app root */}
            <Link
              href="/"
              className="flex items-center overflow-visible min-h-8 hover:opacity-80 transition-opacity"
              aria-label={`Go to ${branding.appName ?? "Trade"} home`}
            >
              {branding.logoUrl ? (
                // Brand assets arrive in wild aspect ratios - cap both
                // height and width so wide wordmarks don't blow out the
                // h-14/16 bar (AppLogo's fixed height caps neither).
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logoUrl}
                  alt={`${branding.appName ?? "Brand"} logo`}
                  className="h-7 w-auto max-w-[180px] object-contain lg:h-8 lg:max-w-[220px]"
                />
              ) : (
                <AppLogo size={40} />
              )}
            </Link>

            {/* Right: Theme toggle + network switcher + wallet button */}
            <div className="flex items-center gap-2">{controls}</div>
          </div>
        </header>
      )}

      {/* Content area. No SiteFooter here (unlike earn's post-auth):
          the floating bottom NavBar owns the bottom edge, and a
          marketing footer colliding with it reads as clutter - the
          scenario front door carries the Dynamic footer instead. */}
      <main className="flex-1 overflow-auto px-4 lg:px-8 pt-3 lg:pt-4 pb-24 scrollbar-thin">
        {children}
      </main>

      {/* Floating bottom nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <NavBar />
      </div>
    </div>
  );
}
