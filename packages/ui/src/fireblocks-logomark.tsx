"use client";

import { cn } from "@dynamic-demos/utils";

export type FireblocksLogomarkVariant = "blue" | "navy" | "white";

const VARIANT_FILLS: Record<FireblocksLogomarkVariant, string> = {
  blue: "#678bff",
  navy: "#212647",
  white: "#fff",
};

export interface FireblocksLogomarkProps {
  className?: string;
  /** Preset variant: blue, navy, or white. Ignored when fill is provided. */
  variant?: FireblocksLogomarkVariant;
  /** Override fill color. Takes precedence over variant. */
  fill?: string;
}

/**
 * Fireblocks Network logomark (shield icon).
 * Use variant for preset colors, or fill to override.
 */
export function FireblocksLogomark({
  className,
  variant = "navy",
  fill,
}: FireblocksLogomarkProps) {
  const pathFill = fill ?? VARIANT_FILLS[variant];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 96 96"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        fill={pathFill}
        d="M82,0H14C6.3,0,0,6.3,0,14v68c0,7.7,6.3,14,14,14h68c7.7,0,14-6.3,14-14V14c0-7.7-6.3-14-14-14ZM65.5,68H30.5c-3.9,0-6.3-4.2-4.3-7.5l17.6-30c1.9-3.3,6.7-3.3,8.6,0l17.4,30c1.9,3.3-.5,7.5-4.3,7.5Z"
      />
    </svg>
  );
}
