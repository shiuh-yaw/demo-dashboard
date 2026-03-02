"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import { cn } from "@dynamic-demos/utils";

export interface ScrollableWithFadeProps {
  /** Content to render inside scrollable area */
  children: ReactNode;
  /** Additional class names for the container */
  className?: string;
  /** Additional class names for the content wrapper */
  contentClassName?: string;
  /** Max height CSS value */
  maxHeight?: string;
  /** Fade height in pixels */
  fadeHeight?: number;
}

/**
 * Scrollable container with fade overlays at top/bottom.
 * Fades appear when content overflows in that direction.
 */
function ScrollableWithFade({
  children,
  className,
  contentClassName,
  maxHeight = "max-h-80",
  fadeHeight = 24,
}: ScrollableWithFadeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
    };

    // Check on mount and content changes
    const rafId = requestAnimationFrame(checkScroll);

    // Check on scroll
    el.addEventListener("scroll", checkScroll, { passive: true });

    // Check on resize
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", checkScroll);
      resizeObserver.disconnect();
    };
  }, [children]);

  return (
    <div className={cn("relative", className)}>
      {/* Top fade */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 pointer-events-none z-10",
          "bg-gradient-to-b from-[var(--widget-bg,#ffffff)] to-transparent",
          "transition-opacity duration-200",
          canScrollUp ? "opacity-100" : "opacity-0"
        )}
        style={{ height: fadeHeight }}
      />

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={cn(
          "overflow-y-auto scrollbar-thin",
          maxHeight,
          contentClassName
        )}
      >
        {children}
      </div>

      {/* Bottom fade */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 pointer-events-none z-10",
          "bg-gradient-to-t from-[var(--widget-bg,#ffffff)] to-transparent",
          "transition-opacity duration-200",
          canScrollDown ? "opacity-100" : "opacity-0"
        )}
        style={{ height: fadeHeight }}
      />
    </div>
  );
}

export { ScrollableWithFade };
