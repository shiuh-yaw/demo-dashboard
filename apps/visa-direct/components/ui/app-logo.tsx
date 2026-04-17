"use client";

/**
 * App Logo
 *
 * Displays the Dynamic logo by default. When a custom `logoUrl` is provided
 * via branding config, renders that image instead.
 */

import { DynamicLogo } from "@dynamic-demos/ui";

interface AppLogoProps {
  className?: string;
  /** Icon-only (no wordmark) — for tight placements. */
  iconOnly?: boolean;
  /** URL of a hosted logo. When provided, uses custom logo; otherwise Dynamic. */
  logoUrl?: string;
  /** Size in px. Maps to a Tailwind height class (24, 28, 32, 40, 48). */
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
