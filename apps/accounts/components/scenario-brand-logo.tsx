"use client";

/**
 * Prospect logo - a thin config-reading island so the page stays a server
 * component. Rendering (aspect normalization, spacing) lives in the shared
 * `<ScenarioBrandImage>` so every scenario page matches. Renders nothing under
 * default Dynamic chrome: `<SiteHeader>` already brands the page.
 */

import { ScenarioBrandImage } from "@dynamic-demos/ui";
import { useAccountsConfig } from "@/contexts/accounts-config-context";

export function ScenarioBrandLogo({
  align = "center",
}: {
  align?: "start" | "center";
}) {
  const config = useAccountsConfig();
  const branding = config?.branding;

  // Four shapes reach here. The dashboard can write the image straight into
  // `logo` (a hosted URL, or a `data:` URI once normalized at save time); the
  // typed shape is `logo: "custom"` plus `logoUrl`; and a config seeded from a
  // prospect carries `logoUrl` with no `logo` at all. A bare `logoUrl` is
  // enough - there is nothing else it could mean.
  const rawLogo = branding?.logo as string | undefined;
  const logoUrl =
    rawLogo && (rawLogo.startsWith("http") || rawLogo.startsWith("data:"))
      ? rawLogo
      : rawLogo === undefined || rawLogo === "custom"
        ? branding?.logoUrl
        : undefined;

  // Same reason as above: seeded configs named it `appName`.
  const brandName =
    branding?.name ?? (branding as { appName?: string } | undefined)?.appName;

  if (!logoUrl) return null;

  return (
    <ScenarioBrandImage
      src={logoUrl}
      alt={brandName ? `${brandName} logo` : "Brand logo"}
      align={align}
    />
  );
}
