"use client";

/**
 * Internal demo-detail Analytics - a combined dashboard (charts + filters),
 * NOT a per-prospect drill-in table. Laid out top-to-bottom: filters, metric
 * cards, a full-width sessions-over-time momentum hero, and a demo-fit
 * engagement funnel - aggregated across every prospect running this demo kind.
 *
 * Two-tier visibility, enforced server-side:
 *  - Tier 1 (everything rendered here): counts only across ALL prospects
 *    running this kind - sessions, unique viewers, avg duration, last
 *    viewed, and the momentum + funnel derived from it. No per-prospect
 *    identity ever appears in a label, tooltip, or series - see
 *    `AnalyticsService.demoKindSummary` / `demoKindTimeseries` /
 *    `demoKindFunnel`.
 *  - The scope filter (Mine/Team/All) narrows Tier 1 to the viewer's own or
 *    team's prospects. The narrowed sets are re-derived server-side from the
 *    session on every filter/range change (`resolveKindAnalyticsScope`
 *    behind the actions), never trusted from the client. Client component: it
 *    owns state + lucide icons.
 */

import { useEffect, useState, useTransition } from "react";
import { Activity, BarChart3, Clock, Eye, MousePointerClick, Users } from "lucide-react";
import { AreaChart } from "@dynamic-demos/charts";
import {
  MetricCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/droplet-client";
import { EngagementFunnel } from "@/components/analytics/engagement-funnel";
import type {
  AnalyticsTimeRange,
  DemoConfigKind,
  DemoKindTimeseriesPoint,
  FunnelStage,
} from "@/lib/services/types";
import {
  getDemoKindFunnel,
  getDemoKindTimeseries,
  type KindScopeFilter,
} from "./actions";

export interface AggregateCounts {
  sessions: number;
  viewers: number;
  avgDurationSec: number;
  lastViewedAt: string | null;
}

export interface DemoKindAnalyticsProps {
  kind: DemoConfigKind;
  aggregates: { all: AggregateCounts; mine: AggregateCounts; team: AggregateCounts };
  /** Server-rendered series for the default filter + range - no flash on mount. */
  initialTimeseries: DemoKindTimeseriesPoint[];
  /** Server-rendered funnel for the default filter + range - no flash on mount. */
  initialFunnel: FunnelStage[];
}

export const DEFAULT_KIND_ANALYTICS_RANGE: AnalyticsTimeRange = "7d";
const DEFAULT_FILTER: KindScopeFilter = "all";

const RANGE_OPTIONS: { value: AnalyticsTimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function formatCount(n: number): string {
  return n > 0 ? String(n) : "-";
}

function formatLastViewed(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Avg session duration -> "2m 34s" / "45s"; zero reads as "-".
function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return "-";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Bucket dates are UTC-day strings; format in UTC so the label matches the bucket.
function formatChartDate(x: Date | number | string): string {
  const d = x instanceof Date ? x : new Date(x);
  if (Number.isNaN(d.getTime())) return String(x);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DemoKindAnalytics({
  kind,
  aggregates,
  initialTimeseries,
  initialFunnel,
}: DemoKindAnalyticsProps) {
  const [filter, setFilter] = useState<KindScopeFilter>(DEFAULT_FILTER);
  const [range, setRange] = useState<AnalyticsTimeRange>(DEFAULT_KIND_ANALYTICS_RANGE);
  const [timeseries, setTimeseries] = useState<DemoKindTimeseriesPoint[]>(initialTimeseries);
  const [funnel, setFunnel] = useState<FunnelStage[]>(initialFunnel);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // The server already rendered this exact combo - skip the redundant fetch.
    if (filter === DEFAULT_FILTER && range === DEFAULT_KIND_ANALYTICS_RANGE) {
      setTimeseries(initialTimeseries);
      setFunnel(initialFunnel);
      return;
    }
    let active = true;
    startTransition(() => {
      Promise.all([
        getDemoKindTimeseries(kind, filter, range),
        getDemoKindFunnel(kind, filter, range),
      ]).then(([points, stages]) => {
        if (!active) return;
        setTimeseries(points);
        setFunnel(stages);
      });
    });
    return () => {
      active = false;
    };
    // initialTimeseries/initialFunnel are stable server-render inputs, not deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, filter, range]);

  const agg = aggregates[filter];
  const chartData = timeseries.map((p) => ({
    x: new Date(`${p.date}T00:00:00Z`),
    y: p.sessions,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as KindScopeFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>
        </Tabs>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={MousePointerClick}
          label="Sessions"
          value={formatCount(agg.sessions)}
        />
        <MetricCard icon={Users} label="Unique Viewers" value={formatCount(agg.viewers)} />
        <MetricCard
          icon={Clock}
          label="Avg Duration"
          value={formatDuration(agg.avgDurationSec)}
        />
        <MetricCard
          icon={Eye}
          label="Last Viewed"
          value={formatLastViewed(agg.lastViewedAt)}
        />
      </div>

      {/* Momentum + demo-fit funnel side by side on lg to use the width. */}
      <div
        className={`grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-2 ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <div className="rounded-xl border border-border-divider bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            Sessions Over Time
          </h3>
          <AreaChart
            data={chartData}
            height={280}
            colorIndex={1}
            xFormat={formatChartDate}
            ariaLabel="Sessions over time"
          />
        </div>

        {/* Demo-fit - how well this demo converts viewers to authenticated. */}
        <div className="rounded-xl border border-border-divider bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            Demo Fit - Viewed To Authenticated
          </h3>
          <EngagementFunnel stages={funnel} colorIndex={2} />
        </div>
      </div>
    </div>
  );
}
