// Series colors always resolve to the operator theme's CSS vars, never hardcoded hex.
export type ChartColorIndex = 1 | 2 | 3 | 4 | 5;

// Returns `var(--chart-N)` - inherits light/dark from the nearest [data-surface="operator"] scope.
export function chartColorVar(index: ChartColorIndex): string {
  return `var(--chart-${index})`;
}

// Cycles 1..5 for series/segments beyond the first (donut segments, multi-bar sets).
export function chartColorForOrdinal(ordinal: number): string {
  const index = ((ordinal % 5) + 5) % 5;
  return chartColorVar((index + 1) as ChartColorIndex);
}

// Muted, theme-inherited tone for grid lines and axis text - never a fixed gray hex.
export const CHART_MUTED_COLOR = "currentColor";
export const CHART_MUTED_OPACITY = 0.18;
export const CHART_GRID_DASH = "1,4";
