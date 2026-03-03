"use client";

/**
 * App Logo Component
 *
 * Displays the appropriate logo based on branding config.
 * When logoUrl is provided, uses custom logo; otherwise Dynamic logo.
 * Reused in header and StableCoinCard for consistency.
 */

import { DynamicLogo } from "@dynamic-demos/ui";

interface AppLogoProps {
  className?: string;
  /** Icon only (no wordmark) for compact use like cards */
  iconOnly?: boolean;
  /** URL to a hosted logo. When provided, uses custom logo; otherwise Dynamic. */
  logoUrl?: string;
}

export function AppLogo({
  className,
  iconOnly = false,
  logoUrl,
}: AppLogoProps) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="Logo" className={className} />
    );
  }
  return <DynamicLogo wordmark={!iconOnly} className={className} />;
}
