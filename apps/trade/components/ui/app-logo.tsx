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
  /** Size in px (24, 28, 32, 48). Maps to Tailwind height class. */
  size?: number;
}

const sizeToClass: Record<number, string> = {
  24: "h-6 w-auto",
  28: "h-7 w-auto",
  32: "h-8 w-auto",
  40: "h-10 w-auto",
  48: "h-12 w-auto",
};

export function AppLogo({
  className,
  iconOnly = false,
  logoUrl,
  size,
}: AppLogoProps) {
  const sizeClass = size ? (sizeToClass[size] ?? "h-8 w-auto") : "";
  const finalClassName = [sizeClass, className].filter(Boolean).join(" ");

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="Logo" className={finalClassName || undefined} />
    );
  }
  return (
    <DynamicLogo wordmark={!iconOnly} className={finalClassName || undefined} />
  );
}
