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
import { useBookACallHref } from "./book-a-call";

/**
 * Book a call CTA - the branded hero's right-side action (the default
 * chrome's CTA lives in SiteHeader/SiteFooter instead).
 */
export function BookACallButton() {
  return (
    <a
      href={useBookACallHref()}
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
 *
 * `variant: "hero"` (default) is the in-hero row standing in for the
 * hidden SiteHeader. `"bar"` is a STICKY header bar with SiteHeader's
 * geometry (h-20, top-0) - for apps whose layout owns the header
 * (flow) so the widget-column sticky offset holds under both chromes.
 * Unlike the deliberately-unthemed SiteHeader, the bar rides brand
 * tokens - it IS the brand. Pair with `ScenarioBrandImage align="bar"`.
 */
export function ScenarioBrandRow({
  logo,
  variant = "hero",
  logoHref,
  sticky = true,
}: {
  logo?: ReactNode;
  variant?: "hero" | "bar";
  /** Wraps the logo in a link (e.g. flow's bar links home to "/"). */
  logoHref?: string;
  /** `bar` only: pin to top on scroll. Default true; flow opts out. */
  sticky?: boolean;
}) {
  const logoSlot =
    logo && logoHref ? (
      <a href={logoHref} className="flex items-center">
        {logo}
      </a>
    ) : (
      (logo ?? <span aria-hidden />)
    );
  const row = (
    <>
      {logoSlot}
      <BookACallButton />
    </>
  );

  if (variant === "bar") {
    return (
      <header
        className={`${sticky ? "sticky top-0 z-40 " : ""}border-b border-(--brand-border) bg-(--brand-page-bg)/90 backdrop-blur`}
      >
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          {row}
        </div>
      </header>
    );
  }

  return <div className="flex items-start justify-between gap-4">{row}</div>;
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
   * itself), `center` above the live widget (wallet's widget scope),
   * `bar` inside a ScenarioBrandRow variant="bar" (no margin - the bar
   * centers it vertically).
   */
  align?: "start" | "center" | "bar";
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
        align === "center" && "mx-auto mb-4",
        align === "start" && "mb-8",
      )}
    />
  );
}
