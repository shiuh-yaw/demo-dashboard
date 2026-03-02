"use client";

import { cn } from "@dynamic-demos/utils";
import { DynamicLogo } from "./dynamic-logo";

export interface PoweredByFooterProps {
  /** Visual variant: default uses widget theme colors, dark uses fixed muted color */
  variant?: "default" | "dark";
  /** Alignment */
  align?: "left" | "center" | "right";
  /** Additional class names */
  className?: string;
}

/**
 * "Powered by Dynamic" footer watermark.
 * Links to dynamic.xyz.
 */
function PoweredByFooter({
  variant = "default",
  align = "center",
  className,
}: PoweredByFooterProps) {
  const colorClass =
    variant === "dark"
      ? "text-[#6b6b6b]"
      : "text-[var(--widget-muted,#9a9a9a)]";

  const alignClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[align];

  return (
    <div className={cn("flex items-center py-2", alignClass, className)}>
      <a
        href="https://dynamic.xyz"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      >
        <span className={cn("text-[11px]", colorClass)}>Powered by</span>
        <DynamicLogo className={colorClass} />
      </a>
    </div>
  );
}

export { PoweredByFooter };
