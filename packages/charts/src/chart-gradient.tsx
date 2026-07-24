"use client";

import { LinearGradient } from "@visx/gradient";
import type { ChartColorIndex } from "./theme";
import { chartColorVar } from "./theme";

interface ChartGradientProps {
  id: string;
  colorIndex: ChartColorIndex;
}

// Soft top-to-bottom fade from the series color to transparent - the demo-illustration look.
export function ChartGradient({ id, colorIndex }: ChartGradientProps) {
  const color = chartColorVar(colorIndex);
  return (
    <LinearGradient id={id} from={color} to={color} fromOpacity={0.25} toOpacity={0} vertical />
  );
}
