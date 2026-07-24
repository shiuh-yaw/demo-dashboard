"use client";

import { ParentSize } from "@visx/responsive";
import type { ReactNode } from "react";

interface ResponsiveChartProps {
  height: number;
  ariaLabel: string;
  children: (size: { width: number; height: number }) => ReactNode;
}

// Fallback width used before ResizeObserver reports a real size (SSR, first paint, jsdom in tests).
const FALLBACK_WIDTH = 320;

// No-op stand-in for environments without a native ResizeObserver (jsdom, very old browsers).
class NoopResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const hasResizeObserver = typeof window !== "undefined" && "ResizeObserver" in window;

// Measures the parent's width client-side; falls back to a sane width so nothing ever blanks out.
export function ResponsiveChart({ height, ariaLabel, children }: ResponsiveChartProps) {
  return (
    <div style={{ width: "100%", height }} role="img" aria-label={ariaLabel}>
      <ParentSize
        debounceTime={10}
        resizeObserverPolyfill={hasResizeObserver ? undefined : NoopResizeObserver}
      >
        {({ width }) => children({ width: width > 0 ? width : FALLBACK_WIDTH, height })}
      </ParentSize>
    </div>
  );
}
