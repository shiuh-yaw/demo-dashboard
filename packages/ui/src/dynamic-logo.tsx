"use client";

import { cn } from "@dynamic-demos/utils";

import {
  DYNAMIC_LOGO_ICON_PATHS,
  DYNAMIC_LOGO_TAGLINE_PATHS,
  DYNAMIC_LOGO_WORDMARK_PATHS,
} from "./dynamic-logo-paths";

export interface DynamicLogoProps {
  /** Additional class names */
  className?: string;
  /** Include "dynamic" wordmark and "a Fireblocks company" tagline. When false, icon only. */
  wordmark?: boolean;
  /** Use currentColor for fills (e.g. grey in footer). When false, uses brand colors. */
  muted?: boolean;
  /**
   * Include the "a Fireblocks company" tagline under the wordmark.
   * Set false for small renders (below ~32px tall the tagline collapses
   * into sub-pixel fuzz). Only meaningful with `wordmark`.
   */
  tagline?: boolean;
}

/**
 * Deterministic ID for SVG defs. useId() causes hydration mismatch in Next.js
 * when server/client trees differ. Props-based ID is stable across SSR (and
 * must differ per variant - responsive headers render two variants at once).
 */
function getLogoId(wordmark: boolean, muted: boolean, tagline: boolean): string {
  return `dynamic-logo-${wordmark ? "w" : "i"}-${muted ? "m" : "b"}${tagline ? "" : "-nt"}`;
}

/** Wordmark fill classes: dark grey for light mode, light grey for dark mode. Uses Tailwind dark: variant so theme is correct on refresh (next-themes sets .dark on html before React runs). */
const WORDMARK_FILL_CLASS = "fill-[#252731] dark:fill-[#E5E5E7]";

/**
 * Dynamic logo SVG — full branding with "a Fireblocks company" tagline.
 * Blue icon (#4779FF), dark wordmark (#252731). Use muted=true for grey (e.g. footer).
 * Wordmark adapts to dark mode for visibility.
 */
function DynamicLogo({
  className,
  wordmark = true,
  muted = false,
  tagline = true,
}: DynamicLogoProps) {
  const fillColor = muted ? "currentColor" : undefined;
  const wordmarkFillClass = !muted && wordmark ? WORDMARK_FILL_CLASS : undefined;
  const id = getLogoId(wordmark, muted, tagline);
  const clipId = `dynamic-logo-clip-${id}`;
  const mask0Id = `dynamic-logo-mask0-${id}`;
  const mask1Id = `dynamic-logo-mask1-${id}`;

  if (!wordmark) {
    // Icon only (blue diamond shapes, or currentColor when muted)
    return (
      <svg
        fill="none"
        viewBox="0 0 102 100"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-3.5", className)}
        aria-label="Dynamic"
      >
        {DYNAMIC_LOGO_ICON_PATHS.map((d) => (
          <path key={d} d={d} fill={fillColor ?? "#4779FF"} />
        ))}
      </svg>
    );
  }

  // Full logo: icon + "dynamic" wordmark + "a Fireblocks company" tagline
  return (
    <svg
      fill="none"
      viewBox={tagline ? "0 0 500 112" : "0 0 500 100"}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-auto", className)}
      aria-label="Dynamic"
    >
      <g clipPath={`url(#${clipId})`}>
        <mask
          id={mask0Id}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="102"
          height="100"
          style={{ maskType: "luminance" }}
        >
          <path d="M101.871 0H0V99.5491H101.871V0Z" fill="white" />
        </mask>
        <g mask={`url(#${mask0Id})`}>
          {DYNAMIC_LOGO_ICON_PATHS.map((d) => (
            <path key={d} d={d} fill={fillColor ?? "#4779FF"} />
          ))}
        </g>
        {DYNAMIC_LOGO_WORDMARK_PATHS.map((d) => (
          <path
            key={d}
            d={d}
            fill={muted ? "currentColor" : undefined}
            className={wordmarkFillClass}
          />
        ))}
        {/* "a Fireblocks company" tagline - skipped at small sizes. */}
        {tagline ? (
          <>
        <mask
          id={mask1Id}
          maskUnits="userSpaceOnUse"
          x="267"
          y="90"
          width="118"
          height="19"
          style={{ maskType: "luminance" }}
        >
          <path
            d="M384.365 90.248H267.654V108.311H384.365V90.248Z"
            fill="white"
          />
        </mask>
        <g mask={`url(#${mask1Id})`}>
          {DYNAMIC_LOGO_TAGLINE_PATHS.slice(0, 11).map((d) => (
            <path
              key={d}
              d={d}
              fill={muted ? "currentColor" : undefined}
              className={wordmarkFillClass}
            />
          ))}
        </g>
        {DYNAMIC_LOGO_TAGLINE_PATHS.slice(11).map((d) => (
          <path
            key={d}
            d={d}
            fill={muted ? "currentColor" : undefined}
            className={wordmarkFillClass}
          />
        ))}
          </>
        ) : null}
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="500" height="112" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export { DynamicLogo };
