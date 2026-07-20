"use client";

/**
 * Custom-brand logo for the scenario hero - a thin config-reading
 * island. Rendering (aspect normalization, spacing) lives in the shared
 * <ScenarioBrandImage> (packages/ui) so every scenario page matches.
 * Falls back to trade's <AppLogo> (Dynamic mark) without a brand image.
 */

import { ScenarioBrandImage } from "@dynamic-demos/ui";
import { AppLogo } from "@/components/ui/app-logo";
import { useTradeConfig } from "@/contexts/trade-config-context";

export function ScenarioBrandLogo() {
  const { branding } = useTradeConfig();

  const logoUrl =
    branding.logoUrl &&
    (branding.logoUrl.startsWith("http") || branding.logoUrl.startsWith("data:"))
      ? branding.logoUrl
      : undefined;

  if (logoUrl) {
    return <ScenarioBrandImage src={logoUrl} />;
  }

  return (
    <div className="mb-8">
      <AppLogo size={40} />
    </div>
  );
}
