"use client";

/**
 * Client leaf for the per-demo catalog launch trend: an area chart of daily
 * launches. Client-only because `@dynamic-demos/charts` renders in the browser
 * and takes a formatter function (not serializable across the RSC boundary).
 */

import { AreaChart } from "@dynamic-demos/charts";
import type { CatalogDemoTimeseriesPoint } from "@/lib/services/types";

function formatChartDate(x: Date | number | string): string {
  const d = x instanceof Date ? x : new Date(x);
  if (Number.isNaN(d.getTime())) return String(x);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function CatalogTrendChart({
  points,
}: {
  points: CatalogDemoTimeseriesPoint[];
}) {
  const data = points.map((p) => ({
    x: new Date(`${p.date}T00:00:00Z`),
    y: p.launches,
  }));

  return (
    <AreaChart
      data={data}
      height={280}
      colorIndex={1}
      xFormat={formatChartDate}
      ariaLabel="Catalog launches over time"
    />
  );
}
