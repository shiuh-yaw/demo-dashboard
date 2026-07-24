"use client";

import { TooltipWithBounds } from "@visx/tooltip";
import type { ReactNode } from "react";

// Themed popover-style tooltip so hover cards inherit the operator surface, never a hardcoded card look.
const TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  pointerEvents: "none",
};

interface ChartTooltipProps {
  top: number;
  left: number;
  children: ReactNode;
}

export function ChartTooltip({ top, left, children }: ChartTooltipProps) {
  return (
    <TooltipWithBounds top={top} left={left} style={TOOLTIP_STYLE}>
      {children}
    </TooltipWithBounds>
  );
}
