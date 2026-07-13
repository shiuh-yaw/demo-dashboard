"use client";

/**
 * Custom-brand logo — a client island so the page stays a server
 * component. Under default Dynamic chrome it renders nothing: the shared
 * <SiteHeader> already brands the page. Placement follows the theme
 * scope: `start` above the hero title (page scope — full immersion),
 * `center` above the live widget (widget scope).
 */

import { useWalletConfig } from "@/contexts/wallet-config-context";

export function ScenarioBrandLogo({
  align = "center",
}: {
  align?: "start" | "center";
}) {
  const config = useWalletConfig();
  const branding = config?.branding;

  if (branding?.logo === "custom" && branding.logoUrl) {
    return (
      <img
        src={branding.logoUrl}
        alt={branding.name ? `${branding.name} logo` : "Brand logo"}
        className={
          align === "center"
            ? "mx-auto mb-4 block h-10 object-contain"
            : "mb-8 block h-10 object-contain"
        }
      />
    );
  }
  return null;
}
