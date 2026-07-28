"use client";

/**
 * Demo instance metrics: the metric-cards row, a sessions-over-time momentum
 * chart with a range filter, and an engagement funnel - scoped to this one
 * demo config rather than the whole prospect. Mirrors the prospect Overview
 * rhythm (`../../prospect-overview.tsx`); reuses its pure formatting helpers
 * rather than forking them. Client component: owns lucide icons and the
 * charts package (both client-only) so neither crosses the RSC boundary.
 *
 * Read scope is re-derived server-side by the page; the momentum range
 * action re-derives it again server-side on every switch.
 */

import { useEffect, useState, useTransition } from "react";
import { BarChart3, Clock, Eye, MousePointerClick, Sparkles, Users } from "lucide-react";
import { AreaChart } from "@dynamic-demos/charts";
import {
  EmptyState,
  MetricCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/droplet-client";
import { EngagementFunnel } from "@/components/analytics/engagement-funnel";
import type {
  AnalyticsTimeRange,
  DemoKindTimeseriesPoint,
  FunnelStage,
} from "@/lib/services/types";
import { getDemoInstanceMomentum } from "./actions";
import {
  formatChartDate,
  formatCount,
  formatDuration,
  formatLastViewed,
  hasEngagementData,
} from "../../prospect-overview-stats";

export const DEFAULT_DEMO_INSTANCE_RANGE: AnalyticsTimeRange = "7d";

const RANGE_OPTIONS: { value: AnalyticsTimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export interface DemoInstanceAnalyticsProps {
  configId: string;
  sessions: number;
  viewers: number;
  avgDurationSec: number;
  lastViewedAt: string | null;
  /** Server-rendered momentum series for the default range - no mount flash. */
  initialMomentum: DemoKindTimeseriesPoint[];
  funnelStages: FunnelStage[];
}

export function DemoInstanceAnalytics({
  configId,
  sessions,
  viewers,
  avgDurationSec,
  lastViewedAt,
  initialMomentum,
  funnelStages,
}: DemoInstanceAnalyticsProps) {
  const [range, setRange] = useState<AnalyticsTimeRange>(DEFAULT_DEMO_INSTANCE_RANGE);
  const [momentum, setMomentum] = useState<DemoKindTimeseriesPoint[]>(initialMomentum);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // The server already rendered the default range - skip the redundant fetch.
    if (range === DEFAULT_DEMO_INSTANCE_RANGE) {
      setMomentum(initialMomentum);
      return;
    }
    let active = true;
    startTransition(() => {
      getDemoInstanceMomentum(configId, range).then((points) => {
        if (active) setMomentum(points);
      });
    });
    return () => {
      active = false;
    };
    // initialMomentum is a stable server-render input, not a reactive dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId, range]);

  const chartData = momentum.map((p) => ({
    x: new Date(`${p.date}T00:00:00Z`),
    y: p.sessions,
  }));

  const noData = !hasEngagementData(sessions);
  const metrics = [
    { icon: MousePointerClick, label: "Sessions", value: formatCount(sessions) },
    { icon: Users, label: "Unique Viewers", value: formatCount(viewers) },
    { icon: Clock, label: "Avg Duration", value: formatDuration(avgDurationSec) },
    { icon: Eye, label: "Last Viewed", value: formatLastViewed(lastViewedAt) },
  ];

  return (
    <div className="space-y-8">
      <section>
        {/* Below sm: compact 2x2 grid, tight padding + smaller number so the row does not eat the viewport before the content below. */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl bg-card px-3 py-2.5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-1.5">
                <m.icon className="size-3.5 text-muted-foreground" />
                <span className="truncate text-[11px] font-medium text-muted-foreground">
                  {m.label}
                </span>
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {m.value}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} icon={m.icon} label={m.label} value={m.value} />
          ))}
        </div>
      </section>

      {noData ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <EmptyState
            icon={Sparkles}
            title="No engagement yet"
            description="Share a demo link with this prospect - engagement shows up here as they view it."
            className="py-6"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Momentum - sessions over time, this demo only. */}
          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Momentum</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Sessions over time on this demo.
                </p>
              </div>
              <Select value={range} onValueChange={(v) => setRange(v as AnalyticsTimeRange)}>
                <SelectTrigger className="w-full sm:w-40 shrink-0" aria-label="Time range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div
              className={`rounded-xl border border-border bg-card p-4 transition-opacity ${
                isPending ? "opacity-60" : ""
              }`}
            >
              <AreaChart
                data={chartData}
                height={260}
                colorIndex={1}
                xFormat={formatChartDate}
                ariaLabel="Sessions over time"
              />
            </div>
          </section>

          {/* Depth - engagement funnel, this demo only. */}
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Engagement Funnel</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                How far viewers get, all time.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                Viewed to authenticated
              </div>
              <EngagementFunnel stages={funnelStages} colorIndex={2} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
