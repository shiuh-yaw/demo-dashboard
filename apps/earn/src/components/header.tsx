"use client";

import { AppLogo } from "./icons";
import { UserMenu } from "./user-menu";
import { useEarnConfig } from "@/contexts/earn-config-context";
import type { DynamicJwtPayload } from "@/lib/auth/dynamic-jwt";

interface HeaderProps {
  user: DynamicJwtPayload | null;
}

export function Header({ user }: HeaderProps) {
  const { branding } = useEarnConfig();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-earn-border shadow-[0_1px_2px_0_rgba(0,0,0,0.1)] z-40 flex items-center px-4">
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
