"use client";

import { AuthLayout } from "@dynamic-demos/ui";
import { AppLogo } from "@/components/ui/app-logo";
import { useRemittanceConfig } from "@/contexts/remittance-config-context";
import { themeToCssVars } from "@/lib/remittance-config";

interface RemittanceAuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Auth layout with logo above the card, matching wallet app pattern.
 * Uses shared AuthLayout from packages/ui (logo + footer).
 * Passes theme overrides so custom branding (primary, accent, etc.) is preserved.
 */
export function RemittanceAuthLayout({ children }: RemittanceAuthLayoutProps) {
  const { branding, theme } = useRemittanceConfig();

  return (
    <AuthLayout
      logo={
        <AppLogo
          className="h-12 w-auto object-contain"
          logoUrl={branding.logoUrl}
        />
      }
      themeOverrides={themeToCssVars(theme)}
    >
      {children}
    </AuthLayout>
  );
}
