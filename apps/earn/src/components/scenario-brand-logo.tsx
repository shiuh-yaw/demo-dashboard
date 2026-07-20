"use client";

/**
 * Custom-brand logo for the scenario hero - a client island so the page
 * stays a server component. Mirrors wallet's scenario-brand-logo
 * (spacing + perceived-size normalization must match across scenario
 * pages). Renders the brand image when the config carries one, falling
 * back to <AppLogo> for earn's built-in brand marks.
 */

import { useState } from "react";
import { cn } from "@dynamic-demos/utils";
import { AppLogo } from "@/components/icons";
import { useEarnConfig } from "@/contexts/earn-config-context";

/**
 * Normalize perceived logo size across wildly different assets: a
 * square padded icon rendered at the same height as a wide wordmark
 * looks tiny. Read the intrinsic aspect ratio on load and size the
 * box accordingly - square-ish icons taller, wide wordmarks shorter.
 */
function sizeClassFor(aspect: number | null): string {
  if (aspect === null) return "h-10"; // pre-load fallback
  if (aspect < 1.6) return "h-14"; // square-ish icon / stacked lockup
  if (aspect > 4) return "h-8"; // wide wordmark
  return "h-10";
}

export function ScenarioBrandLogo() {
  const { branding } = useEarnConfig();
  const [aspect, setAspect] = useState<number | null>(null);

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
    return (
      <img
        src={logoUrl}
        alt="Brand logo"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalHeight > 0) {
            setAspect(img.naturalWidth / img.naturalHeight);
          }
        }}
        className={cn(
          "block max-w-[220px] object-contain mb-8",
          sizeClassFor(aspect),
        )}
      />
    );
  }

  return (
    <AppLogo
      className="h-10 w-auto mb-8"
      brand={branding?.logo}
      logoUrl={branding?.logoUrl}
    />
  );
}
