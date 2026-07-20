"use client";

/**
 * Custom-brand logo for the scenario hero - a thin config-reading
 * island. Rendering (aspect normalization, spacing) lives in the shared
 * <ScenarioBrandImage> (packages/ui) so every scenario page matches.
 * Falls back to <AppLogo> for earn's built-in brand marks.
 */

import { ScenarioBrandImage } from "@dynamic-demos/ui";
import { AppLogo } from "@/components/icons";
import { useEarnConfig } from "@/contexts/earn-config-context";

export function ScenarioBrandLogo() {
  const { branding } = useEarnConfig();

  // Real dashboard configs put the image directly in `logo` - a hosted
  // URL, or a `data:image/png;base64,...` URI once the dashboard has
  // normalized it at save time. The typed shape is `logo: "custom"` +
  // `logoUrl`. Accept all three; earn's built-in brand enums fall back
  // to <AppLogo>.
  const rawLogo = branding?.logo as string | undefined;
  const logoUrl =
    rawLogo && (rawLogo.startsWith("http") || rawLogo.startsWith("data:"))
      ? rawLogo
      : rawLogo === "custom"
        ? branding?.logoUrl
        : undefined;

  if (logoUrl) {
    return <ScenarioBrandImage src={logoUrl} />;
  }

  return (
    <AppLogo
      className="h-10 w-auto mb-8"
      brand={branding?.logo}
      logoUrl={branding?.logoUrl}
    />
  );
}
