"use client";

import { PoweredByFooter } from "@dynamic-demos/ui";
import { AppLogo } from "@/components/app-logo";
import { useRemittanceConfig } from "@/contexts/remittance-config-context";

interface RemittanceAuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Auth layout with logo above the card, matching wallet app pattern.
 */
export function RemittanceAuthLayout({ children }: RemittanceAuthLayoutProps) {
  const { branding } = useRemittanceConfig();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4 bg-(--widget-page-bg)">
      {/* Brand Logo - above the card like wallet */}
      <div className="mb-2">
        <AppLogo
          className="h-12 w-auto object-contain"
          logoUrl={branding.logoUrl}
        />
      </div>

      {/* Card content */}
      <div className="w-full max-w-[400px]">{children}</div>

      <PoweredByFooter />
    </div>
  );
}
