import type { ChartColorIndex } from "./theme";

// Primary time-series datum. x is Date|number|string so callers can pass ISO strings directly.
export interface SeriesPoint {
  x: Date | number | string;
  y: number;
}

// Categorical datum shared by BarChart and DonutChart.
export interface CategoryDatum {
  label: string;
  value: number;
}

export type ValueFormatter = (value: number) => string;
export type XFormatter = (x: Date | number | string) => string;

export interface BaseChartProps {
  height: number;
  colorIndex?: ChartColorIndex;
  valueFormat?: ValueFormatter;
  ariaLabel?: string;
}

export const defaultValueFormat: ValueFormatter = (value) =>
  Number.isFinite(value) ? value.toLocaleString() : "-";

// True when there is nothing meaningful to plot - triggers the shared empty state.
export function isEmptySeries(data: SeriesPoint[]): boolean {
  return data.length === 0 || data.every((d) => !d.y);
}

export function isEmptyCategories(data: CategoryDatum[]): boolean {
  return data.length === 0 || data.every((d) => !d.value);
}

export function isEmptyNumbers(data: number[]): boolean {
  return data.length === 0 || data.every((v) => !v);
}
