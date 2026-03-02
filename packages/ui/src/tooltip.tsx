"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@dynamic-demos/utils";

export interface TooltipProps {
  /** Tooltip content */
  content: string;
  /** Trigger element */
  children: ReactNode;
  /** Position relative to trigger */
  position?: "top" | "bottom";
}

/**
 * Portal-based tooltip that appears on hover.
 * Renders outside container to avoid overflow clipping.
 * SSR-safe with client-side mounting.
 */
function Tooltip({ content, children, position = "bottom" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position when visible
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = tooltipRef.current.offsetWidth;
      const tooltipHeight = tooltipRef.current.offsetHeight;

      const left = rect.left + rect.width / 2 - tooltipWidth / 2;
      const top =
        position === "top"
          ? rect.top - tooltipHeight - 6
          : rect.bottom + 6;

      setCoords({ top, left });
    }
  }, [isVisible, position]);

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {mounted &&
        createPortal(
          <div
            ref={tooltipRef}
            className={cn(
              "fixed z-[9999]",
              "px-2 py-1 text-[11px] whitespace-nowrap",
              "bg-[var(--widget-row-bg,#f6f8f8)] text-[var(--widget-fg,#000000)]",
              "border border-[var(--widget-border,#e7e8ed)]",
              "rounded-md shadow-sm",
              "transition-opacity duration-150",
              isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            style={{ top: coords.top, left: coords.left }}
            role="tooltip"
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}

export { Tooltip };
