"use client";

import { GridRows } from "@visx/grid";
import type { GridScale } from "@visx/grid";
import { CHART_GRID_DASH, CHART_MUTED_COLOR, CHART_MUTED_OPACITY } from "./theme";

interface DottedGridProps<Scale extends GridScale> {
  scale: Scale;
  width: number;
  numTicks?: number;
}

// Subtle dotted horizontal rows instead of solid gridlines - airy, illustration-like, never a heavy axis.
export function DottedGrid<Scale extends GridScale>({
  scale,
  width,
  numTicks = 4,
}: DottedGridProps<Scale>) {
  return (
    <GridRows
      scale={scale}
      width={width}
      numTicks={numTicks}
      stroke={CHART_MUTED_COLOR}
      strokeOpacity={CHART_MUTED_OPACITY}
      strokeDasharray={CHART_GRID_DASH}
      strokeLinecap="round"
    />
  );
}
