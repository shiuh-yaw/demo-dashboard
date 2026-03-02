"use client";

import { type HTMLAttributes } from "react";
import { cn } from "@dynamic-demos/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Render as span for inline contexts (inside <p>, <span>, etc.) */
  inline?: boolean;
}

/**
 * Loading placeholder with pulse animation.
 * Uses CSS variables for theming.
 */
function Skeleton({ className, inline, ...props }: SkeletonProps) {
  const baseClass = cn(
    "animate-pulse rounded-md",
    "bg-[var(--ui-skeleton,var(--widget-row-hover,var(--color-earn-text-secondary,#6b7280))/20)]",
    className
  );

  const Component = inline ? "span" : "div";

  return <Component data-slot="skeleton" className={baseClass} {...(props as HTMLAttributes<HTMLElement>)} />;
}

export { Skeleton };
