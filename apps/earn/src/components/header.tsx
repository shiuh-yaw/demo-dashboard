"use client";

import { AppLogo } from "./icons";
import { UserMenu } from "./user-menu";
import { useEarnConfig } from "@/contexts/earn-config-context";
import type { DynamicJwtPayload } from "@dynamic-demos/dynamic";

interface HeaderProps {
  user: DynamicJwtPayload | null;
  /**
   * Sticky offset - "top-20" when the shared SiteHeader (h-20, sticky
   * top-0 z-40) renders above, so both stick stacked; "top-0" otherwise.
   * The union keeps both classes as literals so Tailwind generates them.
   */
  stickyTopClass?: "top-0" | "top-20";
}

export function Header({ user, stickyTopClass = "top-0" }: HeaderProps) {
  const { branding } = useEarnConfig();

  return (
    <header
      className={`sticky ${stickyTopClass} h-16 bg-white border-b border-earn-border shadow-[0_1px_2px_0_rgba(0,0,0,0.1)] z-30 flex items-center px-4`}
    >
      {/* App Logo */}
      <div className="flex items-center">
        <AppLogo
          className="h-5 w-auto"
          brand={branding.logo}
          logoUrl={branding.logoUrl}
        />
      </div>

      {/* User Menu */}
      <div className="ml-auto">
        <UserMenu user={user} />
      </div>
    </header>
  );
}
