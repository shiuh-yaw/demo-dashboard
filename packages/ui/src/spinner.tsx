"use client";

import { cn } from "@dynamic-demos/utils";

export interface SpinnerProps {
  /** Size of the spinner */
  size?: "sm" | "md" | "lg";
  /** Additional class names */
  className?: string;
}

const SPINNER_SIZES = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-2",
};

/**
 * Loading spinner with animation.
 * Uses a border-based approach with a transparent top segment.
 */
function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "rounded-full animate-spin",
        "border-(--widget-accent) border-t-transparent",
        SPINNER_SIZES[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export { Spinner };
