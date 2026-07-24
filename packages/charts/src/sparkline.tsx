"use client";

import { curveMonotoneX } from "@visx/curve";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import type { ChartColorIndex } from "./theme";
import { chartColorVar } from "./theme";
import { isEmptyNumbers } from "./types";

export interface SparklineProps {
  data: number[];
  colorIndex?: ChartColorIndex;
  width?: number;
  height?: number;
  ariaLabel?: string;
}

interface Point {
  i: number;
  v: number;
}

// Tiny inline trend - no axes, no tooltip, no grid. Meant for table cells / summary rows.
export function Sparkline({ data, colorIndex = 1, width = 120, height = 32, ariaLabel }: SparklineProps) {
  const color = chartColorVar(colorIndex);

  // Fewer than 2 points degenerates the x-domain (renders as a broken/jagged line) - show the muted placeholder instead.
  if (isEmptyNumbers(data) || data.length < 2) {
    return (
      <svg width={width} height={height} role="img" aria-label={ariaLabel ?? "No trend data"}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeDasharray="1,4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const points: Point[] = data.map((v, i) => ({ i, v }));
  const xScale = scaleLinear({ domain: [0, data.length - 1], range: [2, width - 2] });
  const min = Math.min(...data);
  const max = Math.max(...data);
  // A flat series (all equal values) degenerates the y-domain the same way - pad it so the line still renders straight.
  const yScale = scaleLinear({
    domain: min === max ? [min - 1, max + 1] : [min, max],
    range: [height - 2, 2],
  });

  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel ?? "Trend sparkline"}>
      <LinePath<Point>
        data={points}
        x={(d) => xScale(d.i) ?? 0}
        y={(d) => yScale(d.v) ?? 0}
        curve={curveMonotoneX}
        stroke={color}
        strokeWidth={1.5}
      />
    </svg>
  );
}
