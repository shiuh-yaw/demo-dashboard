"use client";

/**
 * Custom-brand logo — a thin config-reading island so the page stays a
 * server component. Rendering (aspect normalization, spacing) lives in
 * the shared <ScenarioBrandImage> (packages/ui) so every scenario page
 * matches. Under default Dynamic chrome it renders nothing: the shared
 * <SiteHeader> already brands the page. Placement follows the theme
 * scope: `start` above the hero title (page scope — full immersion),
 * `center` above the live widget (widget scope).
 */

import { ScenarioBrandImage } from "@dynamic-demos/ui";
import { useWalletConfig } from "@/contexts/wallet-config-context";

export function ScenarioBrandLogo({
  align = "center",
}: {
  align?: "start" | "center";
}) {
  const config = useWalletConfig();
  const branding = config?.branding;

  // Real dashboard configs put the image directly in `logo` — a hosted
  // URL, or a `data:image/png;base64,...` URI once the dashboard has
  // normalized it at save time. The typed shape is `logo: "custom"` +
  // `logoUrl`. Accept all three.
  const rawLogo = branding?.logo as string | undefined;
  const logoUrl =
    rawLogo && (rawLogo.startsWith("http") || rawLogo.startsWith("data:"))
      ? rawLogo
      : rawLogo === "custom"
        ? branding?.logoUrl
        : undefined;

  if (!logoUrl) return null;

  return (
    <ScenarioBrandImage
      src={logoUrl}
      alt={branding?.name ? `${branding.name} logo` : "Brand logo"}
      align={align}
    />
  );
}
