/**
 * Auth Layout for /e/[id]
 *
 * Layout for authentication pages with custom config.
 * Provides the centered container and white card wrapper.
 */

"use client";

import { AppLogo } from "@/components/icons";
import { useEarnConfig } from "@/contexts/earn-config-context";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { branding } = useEarnConfig();

  return (
    <div className="min-h-screen flex items-center justify-center bg-earn-light">
      <div className="bg-white border border-earn-border rounded-lg p-8 max-w-md w-full shadow-lg">
        <div className="flex justify-center mb-2">
          <AppLogo
            className="h-6 w-auto"
            brand={branding.logo}
            logoUrl={branding.logoUrl}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
