"use client";

/**
 * Branded-hero primitives for scenario pages - the row that stands in
 * for the hidden SiteHeader when a `?theme=` config is active, plus the
 * aspect-normalized brand image. Extracted from the wallet/earn/trade
 * copies so spacing and sizing cannot drift between demos. Apps keep a
 * thin `scenario-brand-logo.tsx` that reads THEIR config context and
 * delegates rendering here.
 */

import { useState, type ReactNode } from "react";
import { cn } from "@dynamic-demos/utils";

/**
 * Book a call CTA - the branded hero's right-side action (the default
 * chrome's CTA lives in SiteHeader/SiteFooter instead).
 */
export function BookACallButton() {
  return (
    <a
      href="https://www.dynamic.xyz/book-a-call"
      target="_blank"
      rel="noreferrer"
      className="shrink-0 whitespace-nowrap rounded-(--brand-radius) bg-(--brand-primary) px-4 py-2.5 text-sm font-semibold text-(--brand-primary-fg) transition-opacity hover:opacity-90"
    >
      Book a call
    </a>
  );
}

/**
 * Brand row: logo left, Book a call right. Owns the row's spacing so
 * every scenario page lays out identically. Pass `logo` as the app's
 * config-aware logo island; when omitted (e.g. wallet's widget-scope
 * placement puts the logo elsewhere) an empty spacer keeps the CTA
 * right-aligned.
 */
export function ScenarioBrandRow({ logo }: { logo?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      {logo ?? <span aria-hidden />}
      <BookACallButton />
    </div>
  );
}

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

export interface ScenarioBrandImageProps {
  src: string;
  alt?: string;
  /**
   * `start` above the hero title (page immersion - carries mb-8 below
   * itself), `center` above the live widget (wallet's widget scope).
   */
  align?: "start" | "center";
}

export function ScenarioBrandImage({
  src,
  alt = "Brand logo",
  align = "start",
}: ScenarioBrandImageProps) {
  const [aspect, setAspect] = useState<number | null>(null);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand logos
    // are tiny config-driven assets from arbitrary hosts; next/image
    // optimization buys nothing here and needs remotePatterns per host.
    <img
      src={src}
      alt={alt}
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
