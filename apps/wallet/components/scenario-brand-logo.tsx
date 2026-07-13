"use client";

/**
 * Custom-brand logo — a client island so the page stays a server
 * component. Under default Dynamic chrome it renders nothing: the shared
 * <SiteHeader> already brands the page. Placement follows the theme
 * scope: `start` above the hero title (page scope — full immersion),
 * `center` above the live widget (widget scope).
 */

import { useState } from "react";
import { cn } from "@dynamic-demos/utils";
import { useWalletConfig } from "@/contexts/wallet-config-context";

/**
 * Normalize perceived logo size across wildly different assets: a
 * square padded icon rendered at the same height as a wide wordmark
 * looks tiny. Read the intrinsic aspect ratio on load and size the
 * box accordingly — square-ish icons taller, wide wordmarks shorter.
 */
function sizeClassFor(aspect: number | null): string {
  if (aspect === null) return "h-10"; // pre-load fallback
  if (aspect < 1.6) return "h-14"; // square-ish icon / stacked lockup
  if (aspect > 4) return "h-8"; // wide wordmark
  return "h-10";
}

export function ScenarioBrandLogo({
  align = "center",
}: {
  align?: "start" | "center";
}) {
  const config = useWalletConfig();
  const branding = config?.branding;
  const [aspect, setAspect] = useState<number | null>(null);

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

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={branding?.name ? `${branding.name} logo` : "Brand logo"}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalHeight > 0) {
            setAspect(img.naturalWidth / img.naturalHeight);
          }
        }}
        className={cn(
          "block max-w-[220px] object-contain",
          sizeClassFor(aspect),
          align === "center" ? "mx-auto mb-4" : "mb-8",
        )}
      />
    );
  }
  return null;
}
