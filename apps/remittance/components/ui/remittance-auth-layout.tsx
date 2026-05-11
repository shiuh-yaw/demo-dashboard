"use client";

import { AuthLayout } from "@dynamic-demos/ui";
import { AppLogo } from "@/components/ui/app-logo";
import { useRemittanceConfig } from "@/contexts/remittance-config-context";

interface RemittanceAuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Auth layout with logo above the card, matching wallet app pattern.
 * Uses shared AuthLayout from packages/ui (logo + footer).
 *
 * No per-instance theme overrides — `--brand-*` tokens are emitted once
 * at SSR by `<ThemeStyleTag>` in the root `app/layout.tsx`, and the
 * `--widget-*` compat shims in `app/globals.css` alias them so this
 * layout (and the LoginForm it renders) picks up the brand colors.
 */
export function RemittanceAuthLayout({ children }: RemittanceAuthLayoutProps) {
  const { branding } = useRemittanceConfig();

  return (
    <AuthLayout
      logo={
        <AppLogo
          className="h-12 w-auto object-contain"
          logoUrl={branding.logoUrl}
        />
      }
      showThemeToggle={false}
    >
      {children}
    </AuthLayout>
  );
}
