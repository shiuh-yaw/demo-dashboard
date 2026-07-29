"use client";

/**
 * Custom-brand logo for the scenario hero - a thin config-reading island
 * so the layout stays a server component. Rendering (aspect
 * normalization, spacing) lives in the shared `<ScenarioBrandImage>`
 * (packages/ui) so every scenario page matches. Under default Dynamic
 * chrome it renders nothing: the shared `<SiteHeader>` brands the page.
 */

import { ScenarioBrandImage } from "@dynamic-demos/ui";
import { useBranding } from "@/components/branding-provider";

export function ScenarioBrandLogo({
  align = "center",
}: {
  align?: "start" | "center";
}) {
  const { name, logoUrl } = useBranding();
  if (!logoUrl) return null;

  return (
    <ScenarioBrandImage
      src={logoUrl}
      alt={name ? `${name} logo` : "Brand logo"}
      align={align}
    />
  );
}
