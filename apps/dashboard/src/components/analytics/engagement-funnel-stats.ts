/**
 * Pure layout math for the shared engagement funnel. No React/droplet imports
 * so the width + conversion logic is unit-testable in the node test env.
 */

import type { FunnelStage } from "@/lib/services/types";

export interface FunnelRow {
  key: string;
  label: string;
  count: number;
  /** Bar width as a percentage of the first (base) stage; base stage is 100. */
  widthPct: number;
  /** Conversion vs the first stage, rounded to a whole percent. */
  conversionPct: number;
}

/** The first stage is the funnel base; render nothing meaningful without it. */
export function hasFunnelData(stages: readonly FunnelStage[]): boolean {
  return stages.length > 0 && (stages[0]?.count ?? 0) > 0;
}

/**
 * Bars scale to the first stage (the funnel base), which is the max for a
 * non-increasing funnel; a later stage that exceeds the base is clamped to
 * 100 so a bar never overflows its track. Base of 0 yields all-zero widths.
 */
export function computeFunnelRows(stages: readonly FunnelStage[]): FunnelRow[] {
  const base = stages[0]?.count ?? 0;
  return stages.map((s) => {
    const ratio = base > 0 ? s.count / base : 0;
    const pct = Math.min(100, Math.round(ratio * 100));
    return {
      key: s.key,
      label: s.label,
      count: s.count,
      widthPct: pct,
      conversionPct: pct,
    };
  });
}
