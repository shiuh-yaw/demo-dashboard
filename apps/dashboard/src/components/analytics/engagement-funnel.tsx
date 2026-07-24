/**
 * Shared engagement funnel - labeled horizontal bars, one per stage, width
 * proportional to the first (base) stage with count + conversion %. Renders
 * whatever stages come back (3 today, +Completed when present) - never
 * hardcodes a stage count. Reused by the prospect overview, demo detail, and
 * org analytics surfaces. Presentational only (no hooks), so it works from
 * either a server or client parent; pure layout math lives in
 * ./engagement-funnel-stats for node-testability.
 */

import type { FunnelStage } from "@/lib/services/types";
import { computeFunnelRows, hasFunnelData } from "./engagement-funnel-stats";

type FunnelColorIndex = 1 | 2 | 3 | 4 | 5;

export interface EngagementFunnelProps {
  stages: FunnelStage[];
  /** Operator theme series color for the bars (var(--chart-N)); defaults to 2. */
  colorIndex?: FunnelColorIndex;
  /** Shown when there is no base-stage activity yet (sparse-safe). */
  emptyLabel?: string;
}

export function EngagementFunnel({
  stages,
  colorIndex = 2,
  emptyLabel = "Not enough data yet",
}: EngagementFunnelProps) {
  if (!hasFunnelData(stages)) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border-divider text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const rows = computeFunnelRows(stages);
  const barColor = `var(--chart-${colorIndex})`;

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.key} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">{row.label}</span>
            <span className="tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">
                {row.count.toLocaleString()}
              </span>{" "}
              ({row.conversionPct}%)
            </span>
          </div>
          <div className="relative h-8 w-full overflow-hidden rounded-lg bg-foreground/[0.06]">
            <div
              className="absolute inset-y-0 left-0 rounded-lg transition-[width]"
              // Nonzero stages keep a visible sliver so a lone survivor never reads as empty.
              style={{
                width: `${row.widthPct}%`,
                minWidth: row.count > 0 ? "0.5rem" : 0,
                backgroundColor: barColor,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
