"use client";

/**
 * Prospect logo for the scenario hero - a thin config-reading island so the
 * page stays a server component. Rendering lives in the shared
 * <ScenarioBrandImage>. Falls back to the Rimau wordmark when the branded
 * config carries no logo.
 */

import { ScenarioBrandImage } from "@dynamic-demos/ui";
import { useRimauConfig } from "@/contexts/rimau-config-context";
import { Wordmark } from "@/components/wordmark";

export function ScenarioBrandLogo() {
  const { branding } = useRimauConfig();
  const logoUrl =
    branding.logoUrl && (branding.logoUrl.startsWith("http") || branding.logoUrl.startsWith("data:"))
      ? branding.logoUrl
      : undefined;
  if (logoUrl) return <ScenarioBrandImage src={logoUrl} align="start" />;
  return (
    <div className="mb-8">
      <Wordmark />
    </div>
  );
}
